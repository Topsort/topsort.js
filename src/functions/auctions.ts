import { endpoints } from "../constants/endpoints.constant";
import APIClient from "../lib/api-client";
import { withValidation } from "../lib/with-validation";
import { Auction, AuctionResult } from "../types/auctions";
import { Config } from "../types/shared";

async function handler(body: Auction, config: Config): Promise<AuctionResult> {
  const url = `${config.host}/${endpoints.auctions}`;
  const result = await APIClient.post(url.toString(), body, config);

  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
