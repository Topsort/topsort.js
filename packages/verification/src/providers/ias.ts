/**
 * Provisional IAS compatibility boundary.
 *
 * This hostname and the exact external-script shape are assumptions for MVP 2,
 * not confirmed IAS requirements. Replace this module when a representative tag
 * and its documented lifecycle are available.
 */

export const ASSUMED_IAS_HOSTNAME = "pixel.adsafeprotected.com";
const MAX_TAG_LENGTH = 16_384;
const RESOURCE_TIMEOUT_MS = 5_000;

export interface ParsedIasTag {
  readonly src: string;
  readonly async: boolean;
  /** Safe semantic identity, used only after structural validation. */
  readonly identity: string;
}

export type IasFailureCode = "provider_load_timeout" | "provider_load_failed";

export class IasAdapterError extends Error {
  constructor(readonly code: IasFailureCode | "provider_aborted") {
    super(code);
    this.name = "IasAdapterError";
  }
}

export interface IasProviderSession {
  /** Settles when the resource load attempt ends; resolution is not an IAS readiness claim. */
  readonly settled: Promise<void>;
  dispose(): void;
}

export interface IasStartInput {
  readonly element: HTMLElement;
  readonly parsedTag: ParsedIasTag;
  /** Internal test seam; production uses the fixed provisional timeout. */
  readonly resourceTimeoutMs?: number;
}

function parserFor(document: Document): DOMParser {
  const Parser = document.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!Parser) {
    throw new IasAdapterError("provider_load_failed");
  }
  return new Parser();
}

/** Parse and validate only the assumed external IAS script grammar. */
export function parseIasTag(value: string, document: Document): ParsedIasTag {
  if (typeof value !== "string") {
    throw new IasAdapterError("provider_load_failed");
  }
  const source = value.trim();
  if (!source || source.length > MAX_TAG_LENGTH) {
    throw new IasAdapterError("provider_load_failed");
  }

  const parsed = parserFor(document).parseFromString(source, "text/html");
  const scripts = [...parsed.querySelectorAll("script")];
  const elements = [...parsed.querySelectorAll("*")];
  if (
    scripts.length !== 1 ||
    parsed.documentElement.textContent?.trim() ||
    elements.some((element) => !["HTML", "HEAD", "BODY", "SCRIPT"].includes(element.tagName))
  ) {
    throw new IasAdapterError("provider_load_failed");
  }

  const script = scripts[0];
  if (!script || script.textContent?.trim()) {
    throw new IasAdapterError("provider_load_failed");
  }
  const attributes = [...script.attributes];
  if (
    attributes.some(({ name }) => name !== "src" && name !== "async") ||
    !script.hasAttribute("src") ||
    !script.hasAttribute("async")
  ) {
    throw new IasAdapterError("provider_load_failed");
  }

  const rawSrc = script.getAttribute("src");
  if (!rawSrc) {
    throw new IasAdapterError("provider_load_failed");
  }
  let url: URL;
  try {
    url = new URL(rawSrc);
  } catch {
    throw new IasAdapterError("provider_load_failed");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hostname !== ASSUMED_IAS_HOSTNAME
  ) {
    throw new IasAdapterError("provider_load_failed");
  }

  return {
    src: url.href,
    async: true,
    identity: `ias-script:${url.href}`,
  };
}

/** Insert one fresh script into the exact supplied root and return an abortable session. */
export function startIasProvider(input: IasStartInput): IasProviderSession {
  const { element, parsedTag, resourceTimeoutMs = RESOURCE_TIMEOUT_MS } = input;
  const document = element.ownerDocument;
  const script = document.createElement("script");
  script.src = parsedTag.src;
  script.async = parsedTag.async;

  let settled = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolveSettled!: () => void;
  let rejectSettled!: (error: IasAdapterError) => void;
  const settledPromise = new Promise<void>((resolve, reject) => {
    resolveSettled = resolve;
    rejectSettled = reject;
  });

  const cleanup = () => {
    script.removeEventListener("load", onLoad);
    script.removeEventListener("error", onError);
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const finish = (error?: IasAdapterError) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error) {
      script.remove();
      rejectSettled(error);
    } else {
      resolveSettled();
    }
  };
  const onLoad = () => finish();
  const onError = () => {
    if (!disposed) finish(new IasAdapterError("provider_load_failed"));
  };

  script.addEventListener("load", onLoad);
  script.addEventListener("error", onError);
  timer = setTimeout(() => {
    if (!disposed) finish(new IasAdapterError("provider_load_timeout"));
  }, resourceTimeoutMs);

  try {
    element.appendChild(script);
  } catch {
    finish(new IasAdapterError("provider_load_failed"));
  }

  return {
    settled: settledPromise,
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanup();
      script.remove();
      // Disposal is terminal but must not create an unhandled rejection.
      finish();
    },
  };
}
