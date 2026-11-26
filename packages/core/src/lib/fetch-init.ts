import type { TransportRequest } from "./transport";

type HeaderEntry = [string, string];

interface HeadersLike {
  forEach(callback: (value: string, name: string) => void): void;
}

/**
 * Builds the fetch init from the SDK request and the caller's `fetchOptions`.
 * Caller options are applied first, so the fields the SDK owns always win: method, body,
 * the timeout signal and every header the SDK sets (Authorization, X-UA, Content-Type, Accept).
 * Caller headers are kept unless they name one of those headers, compared case-insensitively.
 * A caller signal is kept only when no timeout is configured.
 */
export function buildFetchInit(init: TransportRequest): Record<string, unknown> {
  const { headers: callerHeaders, signal: callerSignal, ...options } = init.options ?? {};
  const sdkHeaderNames = new Set(Object.keys(init.headers).map((name) => name.toLowerCase()));

  const headers: Record<string, string> = {};
  for (const [name, value] of headerEntries(callerHeaders)) {
    if (!sdkHeaderNames.has(name.toLowerCase())) {
      headers[name] = value;
    }
  }

  return {
    ...options,
    method: init.method,
    headers: { ...headers, ...init.headers },
    body: init.body,
    signal: init.signal ?? callerSignal,
  };
}

// Accepts every HeadersInit shape: a Headers instance, an array of pairs or a plain record.
function headerEntries(headers: unknown): HeaderEntry[] {
  if (headers == null) {
    return [];
  }
  if (Array.isArray(headers)) {
    return headers as HeaderEntry[];
  }
  if (typeof (headers as HeadersLike).forEach === "function") {
    const entries: HeaderEntry[] = [];
    (headers as HeadersLike).forEach((value, name) => {
      entries.push([name, value]);
    });
    return entries;
  }
  return Object.entries(headers as Record<string, string>);
}
