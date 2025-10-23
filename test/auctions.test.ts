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
  auctions: [
    {
      type: "listings",
      slots: 1,
      category: { id: "test-category" },
    },
  ],
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

  it("should throw error when all three parameters (category, products, searchQuery) are provided", async () => {
    const invalidAuction: Auction = {
      auctions: [
        {
          type: "listings",
          slots: 1,
          category: { id: "cat123" },
          products: { ids: ["prod1", "prod2"] },
          searchQuery: "test query",
        },
      ],
    };

    try {
      await topsortClient.createAuction(invalidAuction);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusText).toBe(
        "Cannot pass all three parameters: category, products, and searchQuery. Only two at most are allowed.",
      );
    }
  });

  it("should allow passing category and products without searchQuery", async () => {
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);
    const validAuction: Auction = {
      auctions: [
        {
          type: "listings",
          slots: 1,
          category: { id: "cat123" },
          products: { ids: ["prod1", "prod2"] },
        },
      ],
    };

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

  it("should allow passing category and searchQuery without products", async () => {
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);
    const validAuction: Auction = {
      auctions: [
        {
          type: "listings",
          slots: 1,
          category: { id: "cat123" },
          searchQuery: "test query",
        },
      ],
    };

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

  it("should allow passing products and searchQuery without category", async () => {
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);
    const validAuction: Auction = {
      auctions: [
        {
          type: "listings",
          slots: 1,
          products: { ids: ["prod1", "prod2"] },
          searchQuery: "test query",
        },
      ],
    };

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

  it("should allow passing only one parameter", async () => {
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);
    const validAuction: Auction = {
      auctions: [
        {
          type: "listings",
          slots: 1,
          category: { id: "cat123" },
        },
      ],
    };

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

  it("should validate all auctions in the array", async () => {
    const invalidAuction: Auction = {
      auctions: [
        {
          type: "listings",
          slots: 1,
          category: { id: "cat123" },
        },
        {
          type: "banners",
          slots: 1,
          slotId: "slot1",
          category: { id: "cat456" },
          products: { ids: ["prod1"] },
          searchQuery: "test",
        },
      ],
    };

    try {
      await topsortClient.createAuction(invalidAuction);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusText).toBe(
        "Cannot pass all three parameters: category, products, and searchQuery. Only two at most are allowed.",
      );
    }
  });

  it("should throw error when auctions array is missing", async () => {
    const invalidAuction = {} as Auction;

    try {
      await topsortClient.createAuction(invalidAuction);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusText).toBe(
        "Invalid auction request: body and auctions array are required.",
      );
    }
  });
});
