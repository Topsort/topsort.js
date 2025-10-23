import { endpoints } from "../constants/endpoints.constant";
import APIClient from "../lib/api-client";
import { withValidation } from "../lib/with-validation";
import type { Auction, AuctionResult } from "../types/auctions";
import type { Config } from "../types/shared";

function validateAuctionConstraints(auction: Auction): Auction {
  const validatedAuctions = auction.auctions.map((auctionItem) => {
    const hasCategory = auctionItem.category !== undefined;
    const hasProducts = auctionItem.products !== undefined;
    const hasSearchQuery = auctionItem.searchQuery !== undefined;

    const constraintCount = [hasCategory, hasProducts, hasSearchQuery].filter(Boolean).length;

    if (constraintCount > 2) {
      console.warn(
        "Topsort SDK: Auction must specify at most 2 of (category, products, searchQuery). " +
          'All 3 were provided. Dropping "category" to maintain backwards compatibility.',
      );

      // Remove category to satisfy the constraint
      // biome-ignore lint/correctness/noUnusedVariables: ignoreRestSiblings option to ignore unused variables in object destructuring with spread
      const { category, ...rest } = auctionItem;
      return rest;
    }

    return auctionItem;
  });

  return { auctions: validatedAuctions };
}

async function handler(body: Auction, config: Config): Promise<AuctionResult> {
  const validatedBody = validateAuctionConstraints(body);
  const url = `${config.host}/${endpoints.auctions}`;
  const result = await APIClient.post(url.toString(), validatedBody, config);

  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
