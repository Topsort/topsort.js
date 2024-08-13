import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { Config, TopsortEvent } from "../src";
import { apis, baseURL } from "../src/constants/apis.constant";
import { mswServer, returnAuctionSuccess } from "../src/constants/handlers.constant";
import APIClient from "../src/lib/api-client";

describe("apiClient", () => {
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());

  it("should handle custom url with trailing slash", async () => {
    const customURL = `${baseURL}/${apis.auctions}/`;
    const config: Config = {
      apiKey: "apiKey",
    };
    returnAuctionSuccess(`${baseURL}/${apis.auctions}`);

    expect(APIClient.post(customURL, {} as TopsortEvent, config)).resolves.toEqual({
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
