import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "bun:test";
import { apis, baseURL } from "../constants/apis.constant";
import { mswServer, returnError, returnStatus } from "../constants/handlers.constant";
import { reportEvent } from "../functions/report-event";
import type { TopsortEvent } from "../interfaces/events.interface";
import AppError from "../lib/app-error";

describe("reportEvent", () => {
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());

  it("should handle authentication error", async () => {
    returnStatus(401, `${baseURL}/${apis.events}`);
    expect(reportEvent({ apiKey: "apiKey" }, {} as TopsortEvent)).rejects.toEqual({
      status: 401,
      statusText: "",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${apis.events}`);
    expect(reportEvent({ apiKey: "apiKey" }, {} as TopsortEvent)).rejects.toEqual({
      status: 429,
      statusText: "",
      body: {},
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${apis.events}`);
    expect(reportEvent({ apiKey: "apiKey" }, {} as TopsortEvent)).rejects.toEqual({
      status: 500,
      statusText: "",
      body: {},
    });
  });

  it("should handle custom url", async () => {
    returnStatus(200, `https://demo.api.topsort.com/${apis.events}`);
    expect(
      reportEvent(
        {
          apiKey: "apiKey",
          host: "https://demo.api.topsort.com",
        },
        {} as TopsortEvent,
      ),
    ).resolves.toEqual({ ok: true });
  });

  it("should handle fetch error", async () => {
    returnError(`${baseURL}/${apis.events}`);
    expect(
      async () =>
        await reportEvent(
          {
            apiKey: "apiKey",
          },
          {} as TopsortEvent,
        ),
    ).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    expect(async () =>
      reportEvent(
        {
          apiKey: "apiKey",
          host: invalidHost,
        },
        {} as TopsortEvent,
      ),
    ).toThrow(AppError);
  });
});
