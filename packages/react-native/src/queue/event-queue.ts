import type { Event, EventResult } from "@topsort/sdk-core";
import { nextAttemptAt } from "./backoff";
import {
  type DropPolicy,
  type EventStorageAdapter,
  isRecordStorageKey,
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
    return (await this.loadRecords()).length;
  }

  async enqueue(event: Event): Promise<QueueRecord> {
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
    let sent = 0;
    const records = (await this.loadRecords()).sort(
      (a, b) => Date.parse(a.enqueuedAt) - Date.parse(b.enqueuedAt),
    );
    const now = this.now();

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
        await this.remove(record.id);
        return "sent";
      }

      if (result.retry) {
        return await this.scheduleRetry(record);
      }

      // Non-retryable EventResult (should be rare) — drop like Android PERMANENT_FAILURE.
      await this.remove(record.id);
      return "dropped";
    } catch (error) {
      if (isPermanentFailure(error)) {
        await this.remove(record.id);
        return "dropped";
      }
      return await this.scheduleRetry(record);
    }
  }

  private async scheduleRetry(record: QueueRecord): Promise<"retry" | "dropped"> {
    const attempts = record.attempts + 1;
    if (attempts >= this.maxAttempts) {
      await this.remove(record.id);
      return "dropped";
    }

    const updated: QueueRecord = {
      ...record,
      attempts,
      nextAttemptAt: nextAttemptAt(attempts, this.now()),
    };
    await this.persist(updated);
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
    const keys = (await this.storage.getAllKeys()).filter(isRecordStorageKey);
    const records: QueueRecord[] = [];

    for (const key of keys) {
      const raw = await this.storage.getItem(key);
      if (!raw) {
        continue;
      }
      try {
        records.push(JSON.parse(raw) as QueueRecord);
      } catch {
        await this.storage.removeItem(key);
      }
    }

    return records;
  }

  private async persist(record: QueueRecord): Promise<void> {
    await this.storage.setItem(recordStorageKey(record.id), JSON.stringify(record));
  }

  private async remove(id: string): Promise<void> {
    await this.storage.removeItem(recordStorageKey(id));
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
