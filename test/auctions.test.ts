import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { TopsortClient } from "../src";
import { baseURL, endpoints } from "../src/constants/endpoints.constant";
import {
  mswServer,
  returnAuctionSuccess,
  returnError,
  returnStatus,
} from "../src/constants/handlers.constant";
import AppError from "../src/lib/app-error";
import type { Auction } from "../src/types/auctions";

const validAuction: Auction = {
  auctions: [{ type: "listings", slots: 3, category: { id: "cat123" } }],
};

describe("createAuction", () => {
  let topsortClient: TopsortClient;
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());
  beforeEach(() => {
    topsortClient = new TopsortClient({ apiKey: "apiKey" });
  });

  it("should handle authentication error", async () => {
    returnStatus(401, `${baseURL}/${endpoints.auctions}`);
    expect(topsortClient.createAuction(validAuction)).rejects.toEqual({
      status: 401,
      retry: false,
      statusText: "Unauthorized",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${endpoints.auctions}`);
    expect(topsortClient.createAuction(validAuction)).rejects.toEqual({
      status: 429,
      retry: true,
      statusText: "Too Many Requests",
      body: {},
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${endpoints.auctions}`);
    expect(topsortClient.createAuction(validAuction)).rejects.toEqual({
      status: 500,
      retry: true,
      statusText: "Internal Server Error",
      body: {},
    });
  });

  it("should handle custom url", async () => {
    returnAuctionSuccess(`https://demo.api.topsort.com/${endpoints.auctions}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: "https://demo.api.topsort.com",
    });

    expect(topsortClient.createAuction(validAuction)).resolves.toEqual({
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
    returnError(`${baseURL}/${endpoints.auctions}`);
    expect(async () => topsortClient.createAuction(validAuction)).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    topsortClient = new TopsortClient({ apiKey: "apiKey", host: invalidHost });
    expect(async () => topsortClient.createAuction(validAuction)).toThrow(AppError);
  });

  it("should handle success auction with timeout", async () => {
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: baseURL,
      timeout: 50,
    });

    expect(topsortClient.createAuction(validAuction)).resolves.toEqual({
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

  it("should handle custom fetchOptions", async () => {
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: baseURL,
      fetchOptions: { keepalive: false, cache: "no-cache" },
    });

    expect(topsortClient.createAuction(validAuction)).resolves.toEqual({
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

  describe("runtime validation (bypassing TypeScript)", () => {
    it("should reject auction with all 3 triggers", async () => {
      // Using type assertion to bypass compile-time checks
      const invalidAuction = {
        auctions: [
          {
            type: "banners",
            slots: 1,
            slotId: "slot123",
            category: { id: "cat123" },
            products: { ids: ["prod1"] },
            searchQuery: "search term",
          },
        ],
      } as Auction;

      await expect(topsortClient.createAuction(invalidAuction)).rejects.toThrow(
        "Invalid auction: Cannot specify more than 2 triggers (category, products, searchQuery). Found 3 triggers.",
      );
    });

    it("should reject listing auction with no triggers", async () => {
      // Using type assertion to bypass compile-time checks
      const invalidAuction = {
        auctions: [
          {
            type: "listings",
            slots: 1,
          },
        ],
      } as Auction;

      await expect(topsortClient.createAuction(invalidAuction)).rejects.toThrow(
        "Invalid auction: Listings auctions must specify at least one trigger (category, products, or searchQuery).",
      );
    });
  });
});
