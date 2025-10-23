import { endpoints } from "../constants/endpoints.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import type { Auction, AuctionResult } from "../types/auctions";
import type { Config } from "../types/shared";

function validateAuctionConstraints(auction: Auction): void {
  if (!auction.auctions || !Array.isArray(auction.auctions)) {
    throw new AppError(
      400,
      "Invalid auction request: body and auctions array are required.",
      undefined,
    );
  }

  for (const item of auction.auctions) {
    const triggers = [
      item.category !== undefined,
      item.products !== undefined,
      item.searchQuery !== undefined,
    ].filter(Boolean);

    // Check: at most 2 triggers
    if (triggers.length > 2) {
      throw new AppError(
        400,
        `Cannot pass all three parameters: category, products, and searchQuery. Only two at most are allowed. Found ${triggers.length} triggers.`,
        undefined,
      );
    }

    // Check: listings must have at least 1 trigger
    if (item.type === "listings" && triggers.length === 0) {
      throw new AppError(
        400,
        "Listings auctions must specify at least one trigger (category, products, or searchQuery).",
        undefined,
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
