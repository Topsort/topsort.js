import { endpoints } from "../constants/endpoints.constant";
import APIClient from "../lib/api-client";
import { withValidation } from "../lib/with-validation";
import type { Auction, AuctionResult } from "../types/auctions";
import type { Config } from "../types/shared";

function validateAuctionConstraints(auction: Auction): void {
  if (!auction.auctions || !Array.isArray(auction.auctions)) {
    throw new Error("Invalid auction: 'auctions' must be an array");
  }

  for (const item of auction.auctions) {
    const triggers = [
      item.category !== undefined,
      item.products !== undefined,
      item.searchQuery !== undefined,
    ].filter(Boolean);

    // Check: at most 2 triggers
    if (triggers.length > 2) {
      throw new Error(
        `Invalid auction: Cannot specify more than 2 triggers (category, products, searchQuery). Found ${triggers.length} triggers.`,
      );
    }

    // Check: listings must have at least 1 trigger
    if (item.type === "listings" && triggers.length === 0) {
      throw new Error(
        "Invalid auction: Listings auctions must specify at least one trigger (category, products, or searchQuery).",
      );
    }
  }
}

async function handler(body: Auction, config: Config): Promise<AuctionResult> {
  validateAuctionConstraints(body);

  const url = `${config.host}/${endpoints.auctions}`;
  const result = await APIClient.post(url.toString(), body, config);

  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
