import { expect, test } from "@playwright/test";
import { apis, baseURL } from "../src/constants/apis.constant";
import { playwrightConstants } from "./constants";

test.describe("Report Events via Topsort SDK", () => {
  test("should report an successfully", async ({ page }) => {
    const mockAPIResponse = {
      ok: true,
    };

    await page.route(`${baseURL}/${apis.events}`, async (route) => {
      await route.fulfill({ json: mockAPIResponse });
    });

    await page.goto(playwrightConstants.url);
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

      if (typeof window.sdk.reportEvent === "undefined") {
        throw new Error("Global function `reportEvent` is not available.");
      }

      return window.sdk.reportEvent(config, event);
    });

    expect(result).toEqual(mockAPIResponse);
  });

  test("should fail to call with missing apiKey", async ({ page }) => {
    const expectedError = { status: 401, statusText: "API Key is required.", body: {} };
    await page.goto(playwrightConstants.url);
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
      if (typeof window.sdk.reportEvent === "undefined") {
        throw new Error("Global function `reportEvent` is not available.");
      }

      return window.sdk.reportEvent(config, event);
    });

    expect(result).toEqual(expectedError);
  });
});
