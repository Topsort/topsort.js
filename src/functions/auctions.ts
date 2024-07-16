import { apis, baseURL } from "../constants/apis.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import type { AuctionResult, TopsortAuction } from "../types/auctions";
import type { Config } from "../types/shared";

async function handler(config: Config, body: TopsortAuction): Promise<AuctionResult> {
  let url: URL;
  try {
    url = new URL(`${config.host || baseURL}/${apis.auctions}`);
  } catch (error) {
    throw new AppError(400, "Invalid URL", {
      error: `Invalid URL: ${config.host || baseURL}/${apis.auctions}`,
    });
  }

  const result = await APIClient.post(url.toString(), body, config);
  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
