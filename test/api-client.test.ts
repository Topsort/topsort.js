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

  it("should use customFetch when provided", async () => {
    let customFetchCalled = false;
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        results: [
          {
            resultType: "listings",
            winners: [],
            error: false,
          },
        ],
      }),
    } as Response;

    const customFetch = async (url: string, options?: RequestInit): Promise<Response> => {
      customFetchCalled = true;
      capturedUrl = url;
      capturedOptions = options;
      return mockResponse;
    };

    const config: Config = {
      apiKey: "test-api-key",
      customFetch,
    };

    const url = `${baseURL}/${endpoints.auctions}`;
    const body = { test: "data" };

    const result = await APIClient.post(url, body, config);

    expect(customFetchCalled).toBe(true);
    expect(capturedUrl).toBe(url);
    expect(capturedOptions?.method).toBe("POST");
    expect(capturedOptions?.headers).toMatchObject({
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer test-api-key",
    });
    expect(capturedOptions?.body).toBe(JSON.stringify(body));
    expect(result).toEqual({
      results: [
        {
          resultType: "listings",
          winners: [],
          error: false,
        },
      ],
    });
  });

  it("should handle customFetch errors properly", async () => {
    const customFetch = async (): Promise<Response> => {
      throw new Error("Custom fetch error");
    };

    const config: Config = {
      apiKey: "test-api-key",
      customFetch,
    };

    const url = `${baseURL}/${endpoints.auctions}`;
    const body = { test: "data" };

    expect(APIClient.post(url, body, config)).rejects.toThrow();
  });

  it("should pass fetchOptions to customFetch", async () => {
    let capturedOptions: RequestInit | undefined;

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ results: [] }),
    } as Response;

    const customFetch = async (url: string, options?: RequestInit): Promise<Response> => {
      capturedOptions = options;
      return mockResponse;
    };

    const config: Config = {
      apiKey: "test-api-key",
      fetchOptions: { keepalive: false, mode: "cors" },
      customFetch,
    };

    const url = `${baseURL}/${endpoints.auctions}`;
    await APIClient.post(url, {}, config);

    expect(capturedOptions?.keepalive).toBe(false);
    expect(capturedOptions?.mode).toBe("cors");
  });
});
