import { apis } from "../constants/apis.constant";
import APIClient from "../lib/api-client";
import { withValidation } from "../lib/with-validation";
import { AuctionResult, TopsortAuction } from "../types/auctions";
import { Config } from "../types/shared";

async function handler(
  body: TopsortAuction,
  config: Config
): Promise<AuctionResult> {
  const url = `${config.host}${apis.auctions}`;
  const result = await APIClient.post(url.toString(), body, config);

  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
