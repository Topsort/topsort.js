/**
 * Compile-time validation tests for auction constraints
 * This file should fail to compile if the type system is working correctly
 * Run with: tsc --noEmit test/compile-time-validation.test.ts
 */

import type { Auction } from "../src/types";

// Valid combinations (should compile)
const validAuction1: Auction = {
  auctions: [{ type: "listings", slots: 3, category: { id: "cat123" } }],
};

const validAuction2: Auction = {
  auctions: [{ type: "listings", slots: 3, products: { ids: ["prod1"] } }],
};

const validAuction3: Auction = {
  auctions: [{ type: "listings", slots: 3, searchQuery: "search term" }],
};

const validAuction4: Auction = {
  auctions: [
    { type: "listings", slots: 3, category: { id: "cat123" }, products: { ids: ["prod1"] } },
  ],
};

const validAuction5: Auction = {
  auctions: [{ type: "banners", slots: 1, slotId: "slot123" }],
};

const validAuction6: Auction = {
  auctions: [{ type: "banners", slots: 1, slotId: "slot123", category: { id: "cat123" } }],
};

const validAuction7: Auction = {
  auctions: [
    {
      type: "banners",
      slots: 1,
      slotId: "slot123",
      category: { id: "cat123" },
      products: { ids: ["prod1"] },
    },
  ],
};

// Invalid combinations (should fail compilation)
const _invalidAuction1: Auction = {
  // @ts-expect-error - All 3 constraints specified for listings (should fail)
  auctions: [
    {
      type: "listings",
      slots: 3,
      category: { id: "cat123" },
      products: { ids: ["prod1"] },
      searchQuery: "search",
    },
  ],
};

const _invalidAuction2: Auction = {
  // @ts-expect-error - All 3 constraints specified for banners (should fail)
  auctions: [
    {
      type: "banners",
      slots: 1,
      slotId: "slot123",
      category: { id: "cat123" },
      products: { ids: ["prod1"] },
      searchQuery: "search",
    },
  ],
};

const _invalidAuction3: Auction = {
  // @ts-expect-error - Listings with no constraints (should fail)
  auctions: [{ type: "listings", slots: 3 }],
};

const _invalidAuction4: Auction = {
  // @ts-expect-error - Banner missing required slotId (should fail)
  auctions: [{ type: "banners", slots: 1 }],
};

const _invalidAuction5: Auction = {
  // @ts-expect-error - Invalid auction type (should fail)
  auctions: [{ type: "invalid", slots: 3 }],
};

// Test that valid combinations work
export const testValidCombinations = () => {
  return [
    validAuction1,
    validAuction2,
    validAuction3,
    validAuction4,
    validAuction5,
    validAuction6,
    validAuction7,
  ];
};
