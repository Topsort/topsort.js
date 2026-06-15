import { afterEach, beforeAll, describe, expect, it } from "bun:test";
import { APIClient, baseURL, type Config, type Event, endpoints } from "@topsort/sdk-core";
import { HttpResponse, http } from "msw";
import { version } from "../package.json";
import { mswServer, returnAuctionSuccess } from "../src/constants/handlers.constant";
import { webTransport } from "../src/transport";

describe("apiClient", () => {
  const apiClient = new APIClient(webTransport, version);

  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());

  it("should handle custom url with trailing slash", async () => {
    const customURL = `${baseURL}/${endpoints.auctions}/`;
    const config: Config = {
      apiKey: "apiKey",
    };
    returnAuctionSuccess(`${baseURL}/${endpoints.auctions}`);

    expect(apiClient.post(customURL, {} as Event, config)).resolves.toEqual({
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

  it("should send X-UA header with sdk version", async () => {
    let xUa: string | null = null;
    mswServer.use(
      http.post(`${baseURL}/${endpoints.auctions}`, ({ request }) => {
        xUa = request.headers.get("X-UA");
        return HttpResponse.json({
          results: [
            {
              resultType: "listings",
              winners: [],
              error: false,
            },
          ],
        });
      }),
    );

    await apiClient.post(`${baseURL}/${endpoints.auctions}`, {} as Event, {
      apiKey: "apiKey",
    });

    expect(xUa).toBe(`@topsort/sdk ${version}`);
  });
});
