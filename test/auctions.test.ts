import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { createAuction } from "../src";
import { apis, baseURL } from "../src/constants/apis.constant";
import {
  mswServer,
  returnAuctionSuccess,
  returnError,
  returnStatus,
} from "../src/constants/handlers.constant";
import AppError from "../src/lib/app-error";
import type { TopsortAuction } from "../src/types/auctions";

describe("createAuction", () => {
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());

  it("should handle authentication error", async () => {
    returnStatus(401, `${baseURL}/${apis.auctions}`);
    expect(createAuction({ apiKey: "apiKey" }, {} as TopsortAuction)).rejects.toEqual({
      status: 401,
      statusText: "Unauthorized",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${apis.auctions}`);
    expect(createAuction({ apiKey: "apiKey" }, {} as TopsortAuction)).rejects.toEqual({
      status: 429,
      statusText: "Too Many Requests",
      body: {},
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${apis.auctions}`);
    expect(createAuction({ apiKey: "apiKey" }, {} as TopsortAuction)).rejects.toEqual({
      status: 500,
      statusText: "Internal Server Error",
      body: {},
    });
  });

  it("should handle custom url", async () => {
    returnAuctionSuccess(`https://demo.api.topsort.com/${apis.auctions}`);
    expect(
      createAuction(
        {
          apiKey: "apiKey",
          host: "https://demo.api.topsort.com",
        },
        {} as TopsortAuction,
      ),
    ).resolves.toEqual({
      results: [
        {
          resultType: "listings",
          winners: [],
          error: false,
        },
        {
          resultType: "banners",
          winners: [],
          error: false,
        },
      ],
    });
  });

  it("should handle fetch error", async () => {
    returnError(`${baseURL}/${apis.auctions}`);
    expect(
      async () =>
        await createAuction(
          {
            apiKey: "apiKey",
          },
          {} as TopsortAuction,
        ),
    ).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    expect(async () =>
      createAuction(
        {
          apiKey: "apiKey",
          host: invalidHost,
        },
        {} as TopsortAuction,
      ),
    ).toThrow(AppError);
  });
});
