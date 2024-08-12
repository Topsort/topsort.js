import { baseURL } from "../constants/apis.constant";
import AppError from "../lib/app-error";
import {
  AuctionResult,
  EventResult,
  TopsortAuction,
  TopsortEvent,
} from "../types";
import { Config } from "../types/shared";

import { createAuction } from "./auctions";
import { reportEvent } from "./events";

class TopsortClient {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.config.host = this.sanitizeUrl(this.config.host ?? baseURL);
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.href.replace(/\/+$/, "");
    } catch (error) {
      throw new AppError(400, "Invalid URL", {
        error: `Invalid URL: ${error}`,
      });
    }
  }

  public async reportEvent(event: TopsortEvent): Promise<EventResult> {
    return reportEvent(event, this.config);
  }

  public async createAuction(auction: TopsortAuction): Promise<AuctionResult> {
    return await createAuction(auction, this.config);
  }
}

export default TopsortClient;
