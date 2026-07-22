import type { Event } from "@topsort/sdk-core";

/** How to enforce {@link OfflineQueueOptions.maxSize}. */
export type DropPolicy = "oldest" | "newest";

/**
 * Persistable storage for durable queue records.
 * Keys are opaque record ids; values are JSON strings.
 */
export interface EventStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/** Emits connectivity changes (RN: NetInfo). */
export interface ConnectivitySource {
  getIsConnected(): Promise<boolean>;
  subscribe(listener: (isConnected: boolean) => void): () => void;
}

/** Emits app lifecycle transitions (RN: AppState). */
export interface AppStateSource {
  subscribe(listener: (state: string) => void): () => void;
}

export interface OfflineQueueOptions {
  /**
   * Persistent store for queued events. Defaults to AsyncStorage via
   * {@link createAsyncStorageAdapter} when omitted.
   */
  storage?: EventStorageAdapter;
  /**
   * Maximum number of persisted records. Defaults to `1000`.
   */
  maxSize?: number;
  /**
   * Which record to drop when `maxSize` is exceeded. Defaults to `"oldest"`.
   */
  dropPolicy?: DropPolicy;
  /**
   * Max send attempts per record before dropping. Defaults to `10`.
   */
  maxAttempts?: number;
  /**
   * Optional connectivity source. Defaults to NetInfo when available.
   * Pass a custom source in tests.
   */
  connectivity?: ConnectivitySource;
  /**
   * Optional AppState source. Defaults to React Native `AppState` when available.
   * Pass a custom source in tests.
   */
  appState?: AppStateSource;
}

/** Persisted queue record (Android Cache record analog). */
export interface QueueRecord {
  id: string;
  event: Event;
  enqueuedAt: string;
  attempts: number;
  nextAttemptAt: number;
}

export const QUEUE_KEY_PREFIX = "topsort.event.";
/** JSON array of record ids — avoids scanning all AsyncStorage keys on each op. */
export const QUEUE_INDEX_KEY: string = `${QUEUE_KEY_PREFIX}__index__`;

export function recordStorageKey(id: string): string {
  return `${QUEUE_KEY_PREFIX}${id}`;
}

export function isRecordStorageKey(key: string): boolean {
  return key.startsWith(QUEUE_KEY_PREFIX) && key !== QUEUE_INDEX_KEY;
}
