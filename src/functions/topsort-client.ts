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
    this.config.host = this.config.host ?? baseURL;
  }

  public async reportEvent(event: TopsortEvent): Promise<EventResult> {
    return reportEvent(event, this.config);
  }

  public async createAuction(auction: TopsortAuction): Promise<AuctionResult> {
    return await createAuction(auction, this.config);
  }
}

export default TopsortClient;
