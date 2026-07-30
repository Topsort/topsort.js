import type { Config as CoreConfig } from "@topsort/sdk-core";
import type { OfflineQueueOptions } from "../queue/types";

export type * from "@topsort/sdk-core";
export type {
  AppStateSource,
  ConnectivitySource,
  DropPolicy,
  EventStorageAdapter,
  OfflineQueueOptions,
  QueueRecord,
} from "../queue/types";

/** React Native SDK config. */
export interface Config extends Omit<CoreConfig, "fetchOptions"> {
  /**
   * Passed through to `fetch`. Uses the global `RequestInit` type — consumers need
   * React Native (or compatible) typings that define it; this package does not ship DOM lib.
   */
  fetchOptions?: RequestInit;
  /**
   * Opt-in durable offline event queue (RN analog of web `keepalive`).
   *
   * When omitted / `false`, `reportEvent` matches Phase 2 / web-core semantics.
   * When `true` or an options object, retryable and network failures are persisted
   * and flushed on reconnect / AppState transitions.
   */
  offlineQueue?: boolean | OfflineQueueOptions;
}
