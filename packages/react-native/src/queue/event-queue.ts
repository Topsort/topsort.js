import type { Event, EventResult } from "@topsort/sdk-core";
import { nextAttemptAt } from "./backoff";
import {
  type DropPolicy,
  type EventStorageAdapter,
  isRecordStorageKey,
  QUEUE_INDEX_KEY,
  QUEUE_KEY_PREFIX,
  type QueueRecord,
  recordStorageKey,
} from "./types";

export type SendEvent = (event: Event) => Promise<EventResult>;

export interface EventQueueOptions {
  storage: EventStorageAdapter;
  maxSize: number;
  dropPolicy: DropPolicy;
  maxAttempts: number;
  send: SendEvent;
  /** Injected for tests. */
  now?: () => number;
  /** Injected for tests. */
  createId?: () => string;
}

/**
 * Durable event queue modeled on topsort.kt Cache + EventEmitterWorker:
 * persist under a record id, delete on success / permanent failure, retry on transient.
 */
export class EventQueue {
  private readonly storage: EventStorageAdapter;
  private readonly maxSize: number;
  private readonly dropPolicy: DropPolicy;
  private readonly maxAttempts: number;
  private readonly send: SendEvent;
  private readonly now: () => number;
  private readonly createId: () => string;
  private flushPromise: Promise<{ sent: number; remaining: number }> | null = null;
  /** Serializes mutate paths so concurrent enqueues cannot bypass maxSize. */
  private writeChain: Promise<unknown> = Promise.resolve();

  constructor(options: EventQueueOptions) {
    this.storage = options.storage;
    this.maxSize = options.maxSize;
    this.dropPolicy = options.dropPolicy;
    this.maxAttempts = options.maxAttempts;
    this.send = options.send;
    this.now = options.now ?? Date.now;
    this.createId =
      options.createId ?? (() => `${this.now()}-${Math.random().toString(36).slice(2)}`);
  }

  async size(): Promise<number> {
    return (await this.loadRecordIds()).length;
  }

  async enqueue(event: Event): Promise<QueueRecord> {
    return this.withWriteLock(async () => {
      const records = await this.loadRecords();
      await this.enforceCap(records);

      if (this.dropPolicy === "newest" && records.length >= this.maxSize) {
        // Cap full and dropping newest means reject this enqueue.
        throw new Error("@topsort/react-native-sdk: offline queue is full (dropPolicy: newest)");
      }

      const record: QueueRecord = {
        id: this.createId(),
        event,
        enqueuedAt: new Date(this.now()).toISOString(),
        attempts: 0,
        nextAttemptAt: this.now(),
      };

      await this.persist(record);
      return record;
    });
  }

  private async withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.writeChain;
    let release!: () => void;
    this.writeChain = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Flush due records oldest-first. Concurrent callers await the in-flight flush. */
  async flush(): Promise<{ sent: number; remaining: number }> {
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.flushPromise = this.runFlush().finally(() => {
      this.flushPromise = null;
    });
    return this.flushPromise;
  }

  private async runFlush(): Promise<{ sent: number; remaining: number }> {
    // Wait out in-flight enqueues, then snapshot under the write lock.
    const records = await this.withWriteLock(async () =>
      (await this.loadRecords()).sort(
        (a, b) => Date.parse(a.enqueuedAt) - Date.parse(b.enqueuedAt),
      ),
    );
    const now = this.now();
    let sent = 0;

    for (const record of records) {
      if (record.nextAttemptAt > now) {
        continue;
      }

      const outcome = await this.attempt(record);
      if (outcome === "sent") {
        sent += 1;
      }
    }

    return { sent, remaining: await this.size() };
  }

  private async attempt(record: QueueRecord): Promise<"sent" | "retry" | "dropped"> {
    try {
      const result = await this.send(record.event);

      if (result.ok) {
        await this.withWriteLock(() => this.remove(record.id));
        return "sent";
      }

      if (result.retry) {
        return await this.scheduleRetry(record);
      }

      // Non-retryable EventResult (should be rare) — drop like Android PERMANENT_FAILURE.
      await this.withWriteLock(() => this.remove(record.id));
      return "dropped";
    } catch (error) {
      if (isPermanentFailure(error)) {
        await this.withWriteLock(() => this.remove(record.id));
        return "dropped";
      }
      return await this.scheduleRetry(record);
    }
  }

  private async scheduleRetry(record: QueueRecord): Promise<"retry" | "dropped"> {
    const attempts = record.attempts + 1;
    if (attempts >= this.maxAttempts) {
      await this.withWriteLock(() => this.remove(record.id));
      return "dropped";
    }

    const updated: QueueRecord = {
      ...record,
      attempts,
      nextAttemptAt: nextAttemptAt(attempts, this.now()),
    };
    await this.withWriteLock(() => this.persist(updated));
    return "retry";
  }

  private async enforceCap(records: QueueRecord[]): Promise<void> {
    if (this.dropPolicy !== "oldest") {
      return;
    }

    while (records.length >= this.maxSize) {
      const sorted = [...records].sort(
        (a, b) => Date.parse(a.enqueuedAt) - Date.parse(b.enqueuedAt),
      );
      const victim = sorted[0];
      if (!victim) {
        break;
      }
      await this.remove(victim.id);
      const index = records.findIndex((record) => record.id === victim.id);
      if (index >= 0) {
        records.splice(index, 1);
      }
    }
  }

  private async loadRecords(): Promise<QueueRecord[]> {
    const ids = await this.loadRecordIds();
    const records: QueueRecord[] = [];

    for (const id of ids) {
      const raw = await this.storage.getItem(recordStorageKey(id));
      if (!raw) {
        continue;
      }
      try {
        records.push(JSON.parse(raw) as QueueRecord);
      } catch {
        await this.storage.removeItem(recordStorageKey(id));
      }
    }

    return records;
  }

  /**
   * Prefer the dedicated index; migrate once from `getAllKeys()` when absent
   * (legacy installs / first AsyncStorage scan).
   */
  private async loadRecordIds(): Promise<string[]> {
    const raw = await this.storage.getItem(QUEUE_INDEX_KEY);
    if (raw != null) {
      try {
        const ids = JSON.parse(raw) as unknown;
        if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
          return ids;
        }
      } catch {
        // Fall through to migrate from a full key scan.
      }
    }

    const keys = (await this.storage.getAllKeys()).filter(isRecordStorageKey);
    const ids = keys.map((key) => key.slice(QUEUE_KEY_PREFIX.length));
    await this.writeIndex(ids);
    return ids;
  }

  private async writeIndex(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      await this.storage.removeItem(QUEUE_INDEX_KEY);
      return;
    }
    await this.storage.setItem(QUEUE_INDEX_KEY, JSON.stringify(ids));
  }

  private async persist(record: QueueRecord): Promise<void> {
    await this.storage.setItem(recordStorageKey(record.id), JSON.stringify(record));
    const ids = await this.loadRecordIds();
    if (!ids.includes(record.id)) {
      ids.push(record.id);
      await this.writeIndex(ids);
    }
  }

  private async remove(id: string): Promise<void> {
    await this.storage.removeItem(recordStorageKey(id));
    const ids = (await this.loadRecordIds()).filter((existing) => existing !== id);
    await this.writeIndex(ids);
  }
}

function isPermanentFailure(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    return status >= 400 && status < 500;
  }
  return false;
}
