/** Internal test seam retained from MVP 1; provider details are not exported. */
import type { IasProviderSession, ParsedIasTag } from "./providers/ias";

export interface ProviderSession {
  dispose(): void;
  readonly settled?: Promise<void>;
}

export interface ProviderStartInput {
  element: HTMLElement;
  renderKey: string;
  tagIdentity: string;
  parsedTag: ParsedIasTag;
}

export type ProviderStartHook = (
  input: ProviderStartInput,
) => ProviderSession | Promise<ProviderSession>;

export type { IasProviderSession };
