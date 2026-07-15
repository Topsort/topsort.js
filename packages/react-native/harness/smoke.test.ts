import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { baseURL, endpoints } from "@topsort/sdk-core";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { TopsortClient } from "../dist/index.js";
import { version } from "../package.json";

const mswServer = setupServer();

describe("react-native sdk harness", () => {
  beforeAll(() => {
    mswServer.listen();
  });

  afterAll(() => {
    mswServer.close();
  });

  it("imports the built package and resolves version for X-UA", async () => {
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
      http.post(`${baseURL}/${endpoints.events}`, () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const client = new TopsortClient({ apiKey: "apiKey" });

    await expect(client.createAuction({ auctions: [] })).resolves.toEqual({
      results: [
        {
          resultType: "listings",
          winners: [],
          error: false,
        },
      ],
    });

    await expect(client.reportEvent({ impressions: [] })).resolves.toEqual({
      ok: true,
      retry: false,
    });

    expect(xUa).toBe(`@topsort/react-native-sdk ${version}`);
  });
});
