import { endpoints } from "../constants/endpoints.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import type { Auction, AuctionResult } from "../types/auctions";
import type { Config } from "../types/shared";

function validateAuctionParams(body: Auction): void {
  if (!body || !body.auctions) {
    throw new AppError(
      400,
      "Invalid auction request: body and auctions array are required.",
      undefined,
    );
  }

  for (const auction of body.auctions) {
    const hasCategory = auction.category !== undefined;
    const hasProducts = auction.products !== undefined;
    const hasSearchQuery = auction.searchQuery !== undefined;

    const paramCount = [hasCategory, hasProducts, hasSearchQuery].filter(Boolean).length;

    if (paramCount > 2) {
      throw new AppError(
        400,
        "Cannot pass all three parameters: category, products, and searchQuery. Only two at most are allowed.",
        undefined,
      );
    }
  }
}

async function handler(body: Auction, config: Config): Promise<AuctionResult> {
  validateAuctionParams(body);

  const url = `${config.host}/${endpoints.auctions}`;
  const result = await APIClient.post(url.toString(), body, config);

  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
