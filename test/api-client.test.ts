import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import type { Config, Event } from "../src";
import { baseURL, endpoints } from "../src/constants/endpoints.constant";
import { mswServer, returnAuctionSuccess } from "../src/constants/handlers.constant";
import APIClient from "../src/lib/api-client";

describe("apiClient", () => {
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());

  it("should handle custom url with trailing slash", async () => {
    const customURL = `${baseURL}/${endpoints.auctions}/`;
    const config: Config = {
      apiKey: "apiKey",
    };
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);

    expect(APIClient.post(customURL, {} as Event, config)).resolves.toEqual({
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
