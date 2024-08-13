import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { TopsortClient } from "../src";
import { apis, baseURL } from "../src/constants/apis.constant";
import {
  mswServer,
  returnAuctionSuccess,
  returnError,
  returnStatus,
} from "../src/constants/handlers.constant";
import AppError from "../src/lib/app-error";
import { TopsortAuction } from "../src/types/auctions";

describe("createAuction", () => {
  let topsortClient: TopsortClient;
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());
  beforeEach(() => {
    topsortClient = new TopsortClient({ apiKey: "apiKey" });
  });

  it("should handle authentication error", async () => {
    returnStatus(401, `${baseURL}/${apis.auctions}`);
    expect(topsortClient.createAuction({} as TopsortAuction)).rejects.toEqual({
      status: 401,
      retry: false,
      statusText: "Unauthorized",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${apis.auctions}`);
    expect(topsortClient.createAuction({} as TopsortAuction)).rejects.toEqual({
      status: 429,
      retry: true,
      statusText: "Too Many Requests",
      body: {},
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${apis.auctions}`);
    expect(topsortClient.createAuction({} as TopsortAuction)).rejects.toEqual({
      status: 500,
      retry: true,
      statusText: "Internal Server Error",
      body: {},
    });
  });

  it("should handle custom url", async () => {
    returnAuctionSuccess(`https://demo.api.topsort.com/${apis.auctions}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: "https://demo.api.topsort.com",
    });

    expect(topsortClient.createAuction({} as TopsortAuction)).resolves.toEqual({
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
    expect(async () => topsortClient.createAuction({} as TopsortAuction)).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    topsortClient = new TopsortClient({ apiKey: "apiKey", host: invalidHost });
    expect(async () => topsortClient.createAuction({} as TopsortAuction)).toThrow(AppError);
  });

  it("should handle success auction with timeout", async () => {
    returnAuctionSuccess(`${baseURL}/${apis.auctions}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: baseURL,
      timeout: 50,
    });

    expect(topsortClient.createAuction({} as TopsortAuction)).resolves.toEqual({
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
});
