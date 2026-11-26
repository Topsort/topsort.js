import { afterEach, beforeEach, describe, expect, it, type Mock, spyOn } from "bun:test";
import { rnTransport } from "../src/transport";

const sdkHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "X-UA": "@topsort/react-native-sdk 0.0.0",
  Authorization: "Bearer apiKey",
};

describe("rnTransport", () => {
  let fetchSpy: Mock<typeof fetch>;
  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch");
  });
  afterEach(() => fetchSpy.mockRestore());

  it("sends the SDK headers and timeout signal when fetchOptions sets them", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));
    const sdkSignal = new AbortController().signal;

    await rnTransport.request("https://api.topsort.com/v2/events", {
      method: "POST",
      headers: sdkHeaders,
      body: "{}",
      signal: sdkSignal,
      options: {
        headers: { Authorization: "Bearer other", "X-Custom": "1" },
        signal: new AbortController().signal,
      },
    });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({ "X-Custom": "1", ...sdkHeaders });
    expect(init.signal).toBe(sdkSignal);
  });
});
