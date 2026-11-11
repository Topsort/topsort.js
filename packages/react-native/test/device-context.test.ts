import { describe, expect, it } from "bun:test";
import type { Event } from "@topsort/sdk-core";
import { applyDeviceContext } from "../src/device-context";

const occurredAt = "2024-10-31T12:00:00Z";

describe("applyDeviceContext", () => {
  it("fills omitted deviceType on every event list", () => {
    const event: Event = {
      impressions: [{ id: "imp-1", occurredAt, opaqueUserId: "user-1", resolvedBidId: "bid-1" }],
      clicks: [{ id: "click-1", occurredAt, opaqueUserId: "user-1", resolvedBidId: "bid-1" }],
      purchases: [
        {
          id: "purchase-1",
          occurredAt,
          opaqueUserId: "user-1",
          items: [{ productId: "p-1", quantity: 1, unitPrice: 2 }],
        },
      ],
      pageviews: [
        {
          id: "page-1",
          occurredAt,
          opaqueUserId: "user-1",
          page: { pageId: "home", type: "home", value: "/" },
        },
      ],
      renders: [{ id: "render-1", occurredAt, opaqueUserId: "user-1", resolvedBidId: "bid-1" }],
    };

    const filled = applyDeviceContext(event);

    expect(filled.impressions?.[0]?.deviceType).toBe("mobile");
    expect(filled.clicks?.[0]?.deviceType).toBe("mobile");
    expect(filled.purchases?.[0]?.deviceType).toBe("mobile");
    expect(filled.pageviews?.[0]?.deviceType).toBe("mobile");
    expect(filled.renders?.[0]?.deviceType).toBe("mobile");
    expect(event.impressions?.[0]?.deviceType).toBeUndefined();
  });

  it("keeps an explicit deviceType", () => {
    const event: Event = {
      impressions: [
        {
          id: "imp-1",
          occurredAt,
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
          deviceType: "desktop",
        },
      ],
      clicks: [
        {
          id: "click-1",
          occurredAt,
          opaqueUserId: "user-1",
          resolvedBidId: "bid-1",
          deviceType: "mobile",
        },
      ],
    };

    const filled = applyDeviceContext(event);

    expect(filled.impressions?.[0]?.deviceType).toBe("desktop");
    expect(filled.clicks?.[0]?.deviceType).toBe("mobile");
    expect(filled.impressions?.[0]).toBe(event.impressions?.[0]);
  });

  it("leaves absent lists absent", () => {
    const event: Event = {};
    const filled = applyDeviceContext(event);

    expect(filled.impressions).toBeUndefined();
    expect(filled.clicks).toBeUndefined();
    expect(filled.purchases).toBeUndefined();
    expect(filled.pageviews).toBeUndefined();
    expect(filled.renders).toBeUndefined();
  });
});
