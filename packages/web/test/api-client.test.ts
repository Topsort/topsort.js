import { afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { APIClient, baseURL, type Config, type Event, endpoints } from "@topsort/sdk-core";
import { delay, HttpResponse, http } from "msw";
import { version } from "../package.json";
import { mswServer, returnAuctionSuccess, returnStatus } from "../src/constants/handlers.constant";
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

    await expect(apiClient.post(customURL, {} as Event, config)).resolves.toEqual({
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

  it("should preserve AppError for invalid URLs", async () => {
    await expect(
      apiClient.post("not-a-valid-url/v2/events", {} as Event, { apiKey: "apiKey" }),
    ).rejects.toEqual({
      status: 400,
      statusText: "Invalid URL",
      retry: false,
      body: expect.objectContaining({ error: expect.stringContaining("Invalid URL") }),
    });
  });

  it("should preserve retry flag for retryable HTTP errors", async () => {
    returnStatus(429, `${baseURL}/${endpoints.events}`);
    await expect(
      apiClient.post(`${baseURL}/${endpoints.events}`, {} as Event, { apiKey: "apiKey" }),
    ).rejects.toEqual({
      status: 429,
      statusText: "Too Many Requests",
      retry: true,
      body: {},
    });
  });

  it("should cancel the request with the caller signal when a timeout is set", async () => {
    mswServer.use(
      http.post(`${baseURL}/${endpoints.events}`, async () => {
        await delay(2000);
        return HttpResponse.json({});
      }),
    );
    const caller = new AbortController();
    const pending = apiClient.post(`${baseURL}/${endpoints.events}`, {} as Event, {
      apiKey: "apiKey",
      timeout: 5000,
      fetchOptions: { signal: caller.signal },
    });
    caller.abort();

    await expect(pending).rejects.toEqual({
      status: 500,
      statusText: "Internal Server Error",
      retry: true,
      body: expect.any(String),
    });
  });

  it("should remove the caller abort listener once a request with a timeout settles", async () => {
    mswServer.use(http.post(`${baseURL}/${endpoints.events}`, () => HttpResponse.json({})));
    const caller = new AbortController();
    const add = spyOn(caller.signal, "addEventListener");
    const remove = spyOn(caller.signal, "removeEventListener");

    await apiClient.post(`${baseURL}/${endpoints.events}`, {} as Event, {
      apiKey: "apiKey",
      timeout: 5000,
      fetchOptions: { signal: caller.signal },
    });

    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0]?.[1]);
  });

  it("should not retry a successful response whose body is not JSON", async () => {
    mswServer.use(
      http.post(`${baseURL}/${endpoints.auctions}`, () => HttpResponse.html("<html>OK</html>")),
    );
    await expect(
      apiClient.post(`${baseURL}/${endpoints.auctions}`, {} as Event, { apiKey: "apiKey" }),
    ).rejects.toEqual({
      status: 500,
      statusText: "Internal Server Error",
      retry: false,
      body: expect.any(String),
    });
  });
});
