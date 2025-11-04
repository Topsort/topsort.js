import { expect, test } from "@playwright/test";
import { baseURL, endpoints } from "../src/constants/endpoints.constant";
import { playwrightConstants } from "./config";

test.describe("Report Events via Topsort SDK", () => {
  test("should report an event successfully", async ({ page }) => {
    const mockAPIResponse = {
      ok: true,
      retry: false,
    };

    await page.route(`${baseURL}/${endpoints.events}`, async (route) => {
      await route.fulfill({ json: mockAPIResponse });
    });

    await page.goto(playwrightConstants.host);
    const result = await page.evaluate(() => {
      const config = {
        apiKey: "rando-api-key",
      };

      const event = {
        impressions: [
          {
            resolvedBidId:
              "ChAGaP5D2ex-UKEEBCOHwvDjEhABkF4FDAx0S5mMD2cOG0w9GhABkEnL2CB6qKIoqeItVgA_InsKd2h0dHBzOi8vd3d3LndlYmEuYmUvZnIvcHJvbW8uaHRtbD91dG1fc291cmNlPW15c2hvcGkmdXRtX21lZGl1bT1iYW5uZXJfMTI4MHg0MDAmdXRtX2NvbnRlbnQ9ZGlzcGxheSZ1dG1fY2FtcGFpZ249c29sZGVuEAU",
            id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46149",
            occurredAt: "2024-07-11T13:55:09Z",
            opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
            placement: {
              path: "/categories/sports",
            },
          },
        ],
      };

      return window.sdk.reportEvent(config, event);
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

      const event = {
        impressions: [
          {
            resolvedBidId:
              "ChAGaP5D2ex-UKEEBCOHwvDjEhABkF4FDAx0S5mMD2cOG0w9GhABkEnL2CB6qKIoqeItVgA_InsKd2h0dHBzOi8vd3d3LndlYmEuYmUvZnIvcHJvbW8uaHRtbD91dG1fc291cmNlPW15c2hvcGkmdXRtX21lZGl1bT1iYW5uZXJfMTI4MHg0MDAmdXRtX2NvbnRlbnQ9ZGlzcGxheSZ1dG1fY2FtcGFpZ249c29sZGVuEAU",
            id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46149",
            occurredAt: "2024-07-11T13:55:09Z",
            opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
            placement: {
              path: "/categories/sports",
            },
          },
        ],
      };

      return window.sdk.reportEvent(config, event);
    });

    expect(result).toEqual(expectedError);
  });

  test("should report a pageview event successfully", async ({ page }) => {
    const mockAPIResponse = {
      ok: true,
      retry: false,
    };

    await page.route(`${baseURL}/${endpoints.events}`, async (route) => {
      await route.fulfill({ json: mockAPIResponse });
    });

    await page.goto(playwrightConstants.host);
    const result = await page.evaluate(() => {
      const config = {
        apiKey: "rando-api-key",
      };

      const event = {
        pageviews: [
          {
            id: "pageview-123",
            occurredAt: "2024-10-31T12:00:00Z",
            opaqueUserId: "user-456",
            page: {
              pageId: "homepage",
              type: "home",
              value: "/",
            },
            deviceType: "mobile",
            channel: "onsite",
          },
        ],
      };

      return window.sdk.reportEvent(config, event);
    });

    expect(result).toEqual(mockAPIResponse);
  });

  test("should report a cart pageview event with product array successfully", async ({ page }) => {
    const mockAPIResponse = {
      ok: true,
      retry: false,
    };

    await page.route(`${baseURL}/${endpoints.events}`, async (route) => {
      await route.fulfill({ json: mockAPIResponse });
    });

    await page.goto(playwrightConstants.host);
    const result = await page.evaluate(() => {
      const config = {
        apiKey: "rando-api-key",
      };

      const event = {
        pageviews: [
          {
            id: "pageview-cart-123",
            occurredAt: "2024-10-31T12:00:00Z",
            opaqueUserId: "user-456",
            page: {
              pageId: "cart",
              type: "cart",
              value: ["product-1", "product-2", "product-3"],
            },
            deviceType: "desktop",
            channel: "onsite",
          },
        ],
      };

      return window.sdk.reportEvent(config, event);
    });

    expect(result).toEqual(mockAPIResponse);
  });
});
