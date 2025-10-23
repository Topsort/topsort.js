import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { type Event, TopsortClient } from "../src";
import { baseURL, endpoints } from "../src/constants/endpoints.constant";
import { mswServer, returnError, returnStatus } from "../src/constants/handlers.constant";
import AppError from "../src/lib/app-error";

describe("reportEvent", () => {
  let topsortClient: TopsortClient;
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());
  beforeEach(() => {
    topsortClient = new TopsortClient({ apiKey: "apiKey" });
  });

  it("should handle authentication error", async () => {
    returnStatus(401, `${baseURL}/${endpoints.events}`);
    expect(topsortClient.reportEvent({} as Event)).rejects.toEqual({
      status: 401,
      retry: false,
      statusText: "Unauthorized",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${endpoints.events}`);
    expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: false,
      retry: true,
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${endpoints.events}`);
    expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: false,
      retry: true,
    });
  });

  it("should handle custom url", async () => {
    returnStatus(204, `https://demo.api.topsort.com/${endpoints.events}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: "https://demo.api.topsort.com",
    });

    expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });

  it("should handle fetch error", async () => {
    returnError(`${baseURL}/${endpoints.events}`);
    expect(async () => await topsortClient.reportEvent({} as Event)).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    topsortClient = new TopsortClient({ apiKey: "apiKey", host: invalidHost });
    expect(async () => topsortClient.reportEvent({} as Event)).toThrow(AppError);
  });

  it("should handle custom fetchOptions", async () => {
    returnStatus(204, `${baseURL}/${endpoints.events}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: baseURL,
      fetchOptions: { keepalive: false, cache: "no-cache" },
    });

    expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });
});
