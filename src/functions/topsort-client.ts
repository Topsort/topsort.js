import { baseURL } from "../constants/endpoints.constant";
import { Auction, AuctionResult, Event, EventResult } from "../types";
import { Config } from "../types/shared";

import { createAuction } from "./auctions";
import { reportEvent } from "./events";

class TopsortClient {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.config.host = this.config.host ?? baseURL;
  }

  public async reportEvent(event: Event): Promise<EventResult> {
    return reportEvent(event, this.config);
  }

  public async createAuction(auction: Auction): Promise<AuctionResult> {
    return createAuction(auction, this.config);
  }
}

export default TopsortClient;
