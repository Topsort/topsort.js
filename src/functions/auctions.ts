import { apis, baseURL } from "../constants/apis.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import { AuctionResult, TopsortAuction } from "../types/auctions";
import { Config } from "../types/shared";

async function handler(config: Config, body: TopsortAuction): Promise<AuctionResult> {
  let url: URL;
  try {
    url = new URL(apis.auctions, config.host || baseURL);
  } catch (error) {
    throw new AppError(400, "Invalid URL", {
      error: `Invalid URL: ${error}`,
    });
  }

  const result = await APIClient.post(url.toString(), body, config);
  return result as AuctionResult;
}

export const createAuction = withValidation(handler);
