import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { AppError, baseURL, type Event, endpoints } from "@topsort/sdk-core";
import { HttpResponse, http } from "msw";
import { TopsortClient } from "../src";
import { mswServer, returnError, returnStatus } from "../src/constants/handlers.constant";

describe("reportEvent", () => {
  let topsortClient: TopsortClient;
  beforeAll(() => mswServer.listen());
  afterEach(() => mswServer.resetHandlers());
  beforeEach(() => {
    topsortClient = new TopsortClient({ apiKey: "apiKey" });
  });

  it("should handle authentication error", async () => {
    returnStatus(401, `${baseURL}/${endpoints.events}`);
    await expect(topsortClient.reportEvent({} as Event)).rejects.toEqual({
      status: 401,
      retry: false,
      statusText: "Unauthorized",
      body: {},
    });
  });

  it("should handle retryable error", async () => {
    returnStatus(429, `${baseURL}/${endpoints.events}`);
    await expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: false,
      retry: true,
    });
  });

  it("should handle server error", async () => {
    returnStatus(500, `${baseURL}/${endpoints.events}`);
    await expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: false,
      retry: true,
    });
  });

  it("should handle custom url", async () => {
    returnStatus(204, `https://demo.api.topsort.com/${endpoints.events}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: "https://demo.api.topsort.com",
    });

    await expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });

  it("should handle fetch error", async () => {
    returnError(`${baseURL}/${endpoints.events}`);
    expect(async () => await topsortClient.reportEvent({} as Event)).toThrow(AppError);
  });

  it("should handle invalid URL error", async () => {
    const invalidHost = "invalid-url";
    topsortClient = new TopsortClient({ apiKey: "apiKey", host: invalidHost });
    expect(async () => topsortClient.reportEvent({} as Event)).toThrow(AppError);
  });

  it("should handle custom fetchOptions", async () => {
    returnStatus(204, `${baseURL}/${endpoints.events}`);
    topsortClient = new TopsortClient({
      apiKey: "apiKey",
      host: baseURL,
      fetchOptions: { cache: "no-cache" },
    });

    await expect(topsortClient.reportEvent({} as Event)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });

  it("should successfully report pageview events", async () => {
    returnStatus(204, `${baseURL}/${endpoints.events}`);
    const pageviewEvent: Event = {
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

    await expect(topsortClient.reportEvent(pageviewEvent)).resolves.toEqual({
      ok: true,
      retry: false,
    });
  });

  it("fills omitted deviceType with mobile on the wire", async () => {
    let body: Event | undefined;
    mswServer.use(
      http.post(`${baseURL}/${endpoints.events}`, async ({ request }) => {
        body = (await request.json()) as Event;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const event: Event = {
      impressions: [
        {
          id: "imp-1",
          occurredAt: "2024-10-31T12:00:00Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
        },
      ],
      clicks: [
        {
          id: "click-1",
          occurredAt: "2024-10-31T12:00:01Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
        },
      ],
      purchases: [
        {
          id: "purchase-1",
          occurredAt: "2024-10-31T12:00:02Z",
          opaqueUserId: "user-1",
          items: [{ productId: "p-1", quantity: 1, unitPrice: 2 }],
        },
      ],
      pageviews: [
        {
          id: "page-1",
          occurredAt: "2024-10-31T12:00:03Z",
          opaqueUserId: "user-1",
          page: { pageId: "home", type: "home", value: "/" },
        },
      ],
      renders: [
        {
          id: "render-1",
          occurredAt: "2024-10-31T12:00:04Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
        },
      ],
    };

    await expect(topsortClient.reportEvent(event)).resolves.toEqual({
      ok: true,
      retry: false,
    });

    expect(body?.impressions?.[0]?.deviceType).toBe("mobile");
    expect(body?.clicks?.[0]?.deviceType).toBe("mobile");
    expect(body?.purchases?.[0]?.deviceType).toBe("mobile");
    expect(body?.pageviews?.[0]?.deviceType).toBe("mobile");
    expect(body?.renders?.[0]?.deviceType).toBe("mobile");
    expect(event.impressions?.[0]?.deviceType).toBeUndefined();
  });

  it("keeps an explicit deviceType on the wire", async () => {
    let body: Event | undefined;
    mswServer.use(
      http.post(`${baseURL}/${endpoints.events}`, async ({ request }) => {
        body = (await request.json()) as Event;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await topsortClient.reportEvent({
      impressions: [
        {
          id: "imp-desktop",
          occurredAt: "2024-10-31T12:00:00Z",
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
          deviceType: "desktop",
        },
      ],
    });

    expect(body?.impressions?.[0]?.deviceType).toBe("desktop");
  });
});
