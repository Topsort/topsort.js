import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { TopsortClient, TopsortEvent } from "../src";
import { apis, baseURL } from "../src/constants/apis.constant";
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
    returnStatus(401, `${baseURL}/${apis.events}`);
    expect(topsortClient.reportEvent({} as TopsortEvent)).rejects.toEqual({
      status: 401,
      retry: false,
      statusText: "Unauthorized",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${apis.events}`);
    expect(topsortClient.reportEvent({} as TopsortEvent)).resolves.toEqual({
      ok: false,
      retry: true,
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${apis.events}`);
    expect(topsortClient.reportEvent({} as TopsortEvent)).resolves.toEqual({
      ok: false,
      retry: true,
    });
  });

  it("should handle custom url", async () => {
    returnStatus(204, `https://demo.api.topsort.com/${apis.events}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: "https://demo.api.topsort.com",
    });

    expect(topsortClient.reportEvent({} as TopsortEvent)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });

  it("should handle fetch error", async () => {
    returnError(`${baseURL}/${apis.events}`);
    expect(async () => await topsortClient.reportEvent({} as TopsortEvent)).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    topsortClient = new TopsortClient({ apiKey: "apiKey", host: invalidHost });
    expect(async () => topsortClient.reportEvent({} as TopsortEvent)).toThrow(AppError);
  });
});
