import { afterEach, beforeEach, describe, expect, it, type Mock, spyOn } from "bun:test";
import { buildFetchInit, type TransportRequest } from "@topsort/sdk-core";
import { webTransport } from "../src/transport";

const sdkHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "X-UA": "@topsort/sdk 0.0.0",
  Authorization: "Bearer apiKey",
};

const request = (overrides: Partial<TransportRequest> = {}): TransportRequest => ({
  method: "POST",
  headers: sdkHeaders,
  body: "{}",
  ...overrides,
});

describe("buildFetchInit", () => {
  it("keeps caller headers next to the SDK headers", () => {
    const init = buildFetchInit(request({ options: { headers: { "X-Custom": "1" } } }));
    expect(init.headers).toEqual({ "X-Custom": "1", ...sdkHeaders });
  });

  it("never lets caller headers replace SDK headers, whatever their case", () => {
    const init = buildFetchInit(
      request({
        options: { headers: { authorization: "Bearer other", "x-ua": "spoofed", "X-Custom": "1" } },
      }),
    );
    expect(init.headers).toEqual({ "X-Custom": "1", ...sdkHeaders });
  });

  it("accepts caller headers as a Headers instance or an array of pairs", () => {
    const fromHeaders = buildFetchInit(
      request({ options: { headers: new Headers({ "X-A": "1" }) } }),
    );
    const fromPairs = buildFetchInit(request({ options: { headers: [["X-A", "1"]] } }));
    expect(fromHeaders.headers).toEqual({ "x-a": "1", ...sdkHeaders });
    expect(fromPairs.headers).toEqual({ "X-A": "1", ...sdkHeaders });
  });

  it("keeps method, body and timeout signal from the SDK", () => {
    const sdkSignal = new AbortController().signal;
    const init = buildFetchInit(
      request({
        signal: sdkSignal,
        options: { method: "GET", body: "other", signal: new AbortController().signal },
      }),
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    expect(init.signal).toBe(sdkSignal);
  });

  it("keeps the caller signal when no timeout is configured", () => {
    const callerSignal = new AbortController().signal;
    const init = buildFetchInit(request({ options: { signal: callerSignal } }));
    expect(init.signal).toBe(callerSignal);
  });

  it("passes other fetch options through", () => {
    const init = buildFetchInit(request({ options: { cache: "no-cache", keepalive: false } }));
    expect(init.cache).toBe("no-cache");
    expect(init.keepalive).toBe(false);
  });
});

describe("webTransport", () => {
  let fetchSpy: Mock<typeof fetch>;
  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch");
  });
  afterEach(() => fetchSpy.mockRestore());

  const sentInit = async (options?: Record<string, unknown>, body = "{}"): Promise<RequestInit> => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));
    await webTransport.request("https://api.topsort.com/v2/events", request({ options, body }));
    return fetchSpy.mock.calls[0][1] as RequestInit;
  };

  it("sends the SDK headers when fetchOptions sets headers", async () => {
    const init = await sentInit({ headers: { "X-Custom": "1" } });
    expect(init.headers).toEqual({ "X-Custom": "1", ...sdkHeaders });
  });

  it("defaults keepalive to true and lets fetchOptions turn it off", async () => {
    expect((await sentInit()).keepalive).toBe(true);
    fetchSpy.mockClear();
    expect((await sentInit({ keepalive: false })).keepalive).toBe(false);
  });

  it("sends keepalive up to 60 KiB and drops it for larger bodies", async () => {
    expect((await sentInit(undefined, "a".repeat(60 * 1024))).keepalive).toBe(true);
    fetchSpy.mockClear();
    expect((await sentInit(undefined, "a".repeat(60 * 1024 + 1))).keepalive).toBe(false);
  });

  it("measures the body limit in bytes, not characters", async () => {
    // "é" is two bytes in UTF-8: the body has 60 KiB characters but is one byte over 60 KiB.
    expect((await sentInit(undefined, `${"a".repeat(60 * 1024 - 1)}é`)).keepalive).toBe(false);
  });
});
