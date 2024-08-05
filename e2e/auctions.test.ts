import { expect, test } from "@playwright/test";
import { baseURL, endpoints } from "../src/constants/endpoints.constant";
import { playwrightConstants } from "./config";

test.describe("Create Auction via Topsort SDK", () => {
  test("should create an auction successfully", async ({ page }) => {
    const mockAPIResponse = {
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
    };

    await page.route(`${baseURL}/${endpoints.auctions}`, async (route) => {
      await route.fulfill({ json: mockAPIResponse });
    });

    await page.goto(playwrightConstants.host);
    const result = await page.evaluate(() => {
      const config = {
        apiKey: "rando-api-key",
      };

      const auctionDetails = {
        auctions: [
          {
            type: "listings",
            slots: 3,
            category: { id: "cat123" },
            geoTargeting: { location: "US" },
          },
          {
            type: "banners",
            slots: 1,
            device: "desktop",
            slotId: "slot123",
            category: { ids: ["cat1", "cat2"] },
            geoTargeting: { location: "UK" },
          },
        ],
      };

      return window.sdk.createAuction(config, auctionDetails);
    });

    expect(result).toEqual(mockAPIResponse);
  });

  test("should fail to call with missing apiKey", async ({ page }) => {
    const expectedError = {
      status: 401,
      retry: false,
      statusText: "API Key is required.",
      body: {},
    };
    await page.goto(playwrightConstants.host);
    const result = await page.evaluate(() => {
      const config = {
        apiKey: null,
      };

      const auctionDetails = {
        auctions: [
          {
            type: "listings",
            slots: 3,
            category: { id: "cat123" },
            geoTargeting: { location: "US" },
          },
          {
            type: "banners",
            slots: 1,
            device: "desktop",
            slotId: "slot123",
            category: { ids: ["cat1", "cat2"] },
            geoTargeting: { location: "UK" },
          },
        ],
      };

      return window.sdk.createAuction(config, auctionDetails);
    });

    expect(result).toEqual(expectedError);
  });

  test("should have a delay when being called with timeout parameter", async ({ page }) => {
    const mockAPIResponse = {
      results: [
        {
          resultType: "listings",
          winners: [],
          error: false,
        },
      ],
    };

    await page.route(`${baseURL}/${apis.auctions}`, async (route) => {
      await delay(100);
      await route.fulfill({ json: mockAPIResponse });
    });

    await page.goto(playwrightConstants.host);
    const result = await page.evaluate(async () => {
      const startTime = Date.now();
      const config = {
        apiKey: "rando-api-key",
        timeOut: 100,
      };

      const auctionDetails = {
        auctions: [
          {
            type: "listings",
            slots: 3,
            category: { id: "cat123" },
            geoTargeting: { location: "US" },
          },
        ],
      };

      const createAuctionResult = await window.sdk.createAuction(config, auctionDetails);
      const endTime = Date.now();
      return { createAuctionResult, timeTaken: endTime - startTime };
    });

    expect(result.createAuctionResult).toEqual(mockAPIResponse);
    expect(result.timeTaken).toBeGreaterThanOrEqual(100);
  });
});
