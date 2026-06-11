import { expect, test } from "@playwright/test";
import { delay } from "msw";
import { baseURL, endpoints } from "../src/constants/endpoints.constant";
import { playwrightConstants } from "./config";

type CustomError = {
  body: string;
  retry: boolean;
  status: number;
  statusText: string;
};

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
    const errorsList = [
      "signal is aborted without reason",
      "The operation was aborted. ",
      "Fetch is aborted",
    ];

    const hasMatchingError = (actualError: CustomError): boolean => {
      return errorsList.some((error) => error === actualError.body);
    };

    await page.route(`${baseURL}/${endpoints.auctions}`, async (route) => {
      await delay(100);
      await route.abort();
    });

    await page.goto(playwrightConstants.host);

    const result = await page.evaluate(async () => {
      const config = {
        apiKey: "rando-api-key",
        timeout: 50,
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

      return window.sdk.createAuction(config, auctionDetails);
    });

    const isErrorFound = hasMatchingError(result);
    expect(isErrorFound).toBeTruthy();
  });
});
