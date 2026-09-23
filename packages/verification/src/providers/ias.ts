/** Confirmed IAS web-display POC bootstrap boundary. */
export const IAS_HOSTNAME = "staticjs.adsafeprotected.com";
export const IAS_PATHNAME = "/fw.js";
export const IAS_SCRIPT_TYPE = "application/javascript";
const MAX_TAG_LENGTH = 16_384;
const EXPECTED_QUERY_PARAMS = new Set(["advEntityId", "pubEntityId"]);

export interface ParsedIasTag {
  readonly src: string;
  readonly type: typeof IAS_SCRIPT_TYPE;
  /** Safe semantic identity, used only after structural validation. */
  readonly identity: string;
}

export type IasFailureCode = "provider_load_failed";

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
}

function parserFor(document: Document): DOMParser {
  const Parser = document.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!Parser) {
    throw new IasAdapterError("provider_load_failed");
  }
  return new Parser();
}

function isWhitespaceText(node: Node): boolean {
  return node.nodeType === node.TEXT_NODE && !node.textContent?.trim();
}

function hasOnlyAllowedNodes(node: Node, allowedElement: Element): boolean {
  for (const child of [...node.childNodes]) {
    if (child === allowedElement || isWhitespaceText(child)) continue;
    return false;
  }
  return true;
}

function hasSingleNumericParam(params: URLSearchParams, name: string): boolean {
  const values = params.getAll(name);
  return values.length === 1 && /^\d+$/.test(values[0] ?? "");
}

function getAttributeCaseInsensitive(element: Element, name: string): string | null {
  return (
    [...element.attributes].find((attribute) => attribute.name.toLowerCase() === name)?.value ??
    null
  );
}

/** Parse and validate only the confirmed IAS web-display POC script grammar. */
export function parseIasTag(value: string, document: Document): ParsedIasTag {
  if (typeof value !== "string") {
    throw new IasAdapterError("provider_load_failed");
  }
  const source = value.trim();
  if (!source || source.length > MAX_TAG_LENGTH) {
    throw new IasAdapterError("provider_load_failed");
  }
  if (!/^<script\b[\s\S]*<\/script>$/i.test(source)) {
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
  if (
    !script ||
    script.textContent?.trim() ||
    !hasOnlyAllowedNodes(parsed.head, script) ||
    !hasOnlyAllowedNodes(parsed.body, script)
  ) {
    throw new IasAdapterError("provider_load_failed");
  }
  const attributes = [...script.attributes];
  const rawSrc = getAttributeCaseInsensitive(script, "src");
  const rawType = getAttributeCaseInsensitive(script, "type");
  if (
    attributes.some(({ name }) => !["src", "type"].includes(name.toLowerCase())) ||
    !rawSrc ||
    !rawType ||
    rawType.toLowerCase() !== IAS_SCRIPT_TYPE
  ) {
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
    url.hash ||
    url.hostname !== IAS_HOSTNAME ||
    url.pathname !== IAS_PATHNAME
  ) {
    throw new IasAdapterError("provider_load_failed");
  }
  const params = url.searchParams;
  if (
    [...params.keys()].some((key) => !EXPECTED_QUERY_PARAMS.has(key)) ||
    !hasSingleNumericParam(params, "advEntityId") ||
    !hasSingleNumericParam(params, "pubEntityId")
  ) {
    throw new IasAdapterError("provider_load_failed");
  }

  return {
    src: url.href,
    type: IAS_SCRIPT_TYPE,
    identity: `ias-script:${url.href}`,
  };
}

/** Insert one fresh script into the exact supplied root and return an abortable session. */
export function startIasProvider(input: IasStartInput): IasProviderSession {
  const { element, parsedTag } = input;
  const document = element.ownerDocument;
  const script = document.createElement("script");
  script.type = parsedTag.type;
  script.src = parsedTag.src;

  let settled = false;
  let disposed = false;
  let resolveSettled!: () => void;
  let rejectSettled!: (error: IasAdapterError) => void;
  const settledPromise = new Promise<void>((resolve, reject) => {
    resolveSettled = resolve;
    rejectSettled = reject;
  });

  const cleanup = () => {
    script.removeEventListener("load", onLoad);
    script.removeEventListener("error", onError);
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
