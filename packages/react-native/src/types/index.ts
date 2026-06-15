import type { Config as CoreConfig } from "@topsort/sdk-core";

export type * from "@topsort/sdk-core";

/** React Native SDK config; fetchOptions are narrowed to fetch-compatible RequestInit. */
export interface Config extends Omit<CoreConfig, "fetchOptions"> {
  fetchOptions?: RequestInit;
}
