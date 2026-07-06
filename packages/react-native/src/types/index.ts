import type { Config as CoreConfig } from "@topsort/sdk-core";

export type * from "@topsort/sdk-core";

/** React Native SDK config. */
export interface Config extends Omit<CoreConfig, "fetchOptions"> {
  /**
   * Passed through to `fetch`. Uses the global `RequestInit` type — consumers need
   * React Native (or compatible) typings that define it; this package does not ship DOM lib.
   */
  fetchOptions?: RequestInit;
}
