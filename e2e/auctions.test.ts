import { expect, test } from "@playwright/test";
import { apis, baseURL } from "../src/constants/apis.constant";
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

    await page.route(`${baseURL}/${apis.auctions}`, async (route) => {
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
      if (typeof window.sdk.createAuction === "undefined") {
        throw new Error("Global function `createAuction` is not available.");
      }

      return window.sdk.createAuction(config, auctionDetails);
    });

    expect(result).toEqual(mockAPIResponse);
  });

  test("should fail to call with missing apiKey", async ({ page }) => {
    const expectedError = { status: 401, statusText: "API Key is required.", body: {} };
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
      if (typeof window.sdk.createAuction === "undefined") {
        throw new Error("Global function `createAuction` is not available.");
      }

      return window.sdk.createAuction(config, auctionDetails);
    });

    expect(result).toEqual(expectedError);
  });
});
