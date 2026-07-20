import {
  AppError,
  TopsortClient as CoreTopsortClient,
  type Event,
  type EventResult,
} from "@topsort/sdk-core";
import { version } from "../package.json";
import {
  createAsyncStorageAdapter,
  createDefaultAppStateSource,
  createDefaultConnectivitySource,
  EventQueue,
  FlushScheduler,
  type OfflineQueueOptions,
} from "./queue";
import { rnTransport } from "./transport";
import type { Config } from "./types";

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_MAX_ATTEMPTS = 10;

export class TopsortClient extends CoreTopsortClient {
  private readonly eventQueue: EventQueue | null = null;
  private readonly flushScheduler: FlushScheduler | null = null;
  private readonly ready: Promise<void>;

  constructor(config: Config) {
    super(config, {
      transport: rnTransport,
      sdkVersion: version,
      sdkPackageName: "@topsort/react-native-sdk",
    });

    const queueOptions = normalizeOfflineQueue(config.offlineQueue);
    if (!queueOptions) {
      this.ready = Promise.resolve();
      return;
    }

    const storage = queueOptions.storage ?? createAsyncStorageAdapter();
    this.eventQueue = new EventQueue({
      storage,
      maxSize: queueOptions.maxSize ?? DEFAULT_MAX_SIZE,
      dropPolicy: queueOptions.dropPolicy ?? "oldest",
      maxAttempts: queueOptions.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      send: (event) => super.reportEvent(event),
    });

    this.flushScheduler = new FlushScheduler(
      this.eventQueue,
      queueOptions.connectivity ?? createDefaultConnectivitySource(),
      queueOptions.appState ?? createDefaultAppStateSource(),
    );

    this.ready = this.flushScheduler.start();
  }

  /**
   * Wait until the offline queue has finished its initial flush wiring.
   * No-op when the durable queue is disabled.
   */
  async whenReady(): Promise<void> {
    await this.ready;
  }

  /** Manually flush persisted events (also runs on reconnect / AppState). */
  async flush(): Promise<{ sent: number; remaining: number }> {
    if (!this.eventQueue) {
      return { sent: 0, remaining: 0 };
    }
    await this.ready;
    return this.eventQueue.flush();
  }

  /** Stop AppState / connectivity listeners. Safe to call multiple times. */
  dispose(): void {
    this.flushScheduler?.stop();
  }

  override async reportEvent(event: Event): Promise<EventResult> {
    if (!this.eventQueue) {
      return super.reportEvent(event);
    }

    await this.ready;

    try {
      const result = await super.reportEvent(event);
      if (result.ok || !result.retry) {
        return result;
      }

      // Core signal: retryable HTTP (429 / 5xx). Take ownership via durable queue.
      return await this.acceptIntoQueue(event);
    } catch (error) {
      if (!isEnqueueableFailure(error)) {
        throw error;
      }
      return await this.acceptIntoQueue(event);
    }
  }

  /**
   * Persist a failed event. If the queue rejects (e.g. full + dropPolicy newest),
   * surface the original retry contract instead of throwing a raw Error.
   */
  private async acceptIntoQueue(event: Event): Promise<EventResult> {
    const queue = this.eventQueue;
    if (!queue) {
      return { ok: false, retry: true };
    }

    try {
      await queue.enqueue(event);
      return { ok: true, retry: false };
    } catch {
      return { ok: false, retry: true };
    }
  }
}

function normalizeOfflineQueue(value: Config["offlineQueue"]): OfflineQueueOptions | null {
  if (!value) {
    return null;
  }
  if (value === true) {
    return {};
  }
  return value;
}

/**
 * Decide whether a thrown failure should be durably queued.
 * Matches Android Worker: network/transient → retry; 4xx → permanent (do not enqueue).
 *
 * Note: core maps HTTP 429/5xx to `{ ok: false, retry: true }` (not throws). Thrown
 * `AppError(500, …)` typically means a transport/network failure from api-client.
 */
function isEnqueueableFailure(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    // Unknown thrown errors are treated as transient (same as kt catch Exception).
    return true;
  }
  if (error.retry) {
    return true;
  }
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  return error.status >= 500;
}
