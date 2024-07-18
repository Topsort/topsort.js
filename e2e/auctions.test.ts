import { expect, test } from "@playwright/test";
import { apis, baseURL } from "../src/constants/apis.constant";

test.describe("Create Auction via Topsort.js", () => {
  test("should create auction successfully", async ({ page }) => {
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

    await page.goto("http://localhost:8080/e2e/index.html");

    await page.fill('input[name="apiKey"]', "your-api-key");
    await page.fill(
      'input[name="auctionDetails"]',
      JSON.stringify({
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
      }),
    );

    await page.click('button[type="submit"]');

    const response = await page.locator("#response").textContent();
    const jsonResponse = JSON.parse(response || "{}");
    expect(jsonResponse).toEqual(mockAPIResponse);
    expect(jsonResponse).toEqual(mockAPIResponse);
  });
});
