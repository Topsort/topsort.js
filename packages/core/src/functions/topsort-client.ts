import { baseURL } from "../constants/endpoints.constant";
import APIClient from "../lib/api-client";
import type { Transport } from "../lib/transport";
import type { Auction, AuctionResult, Event, EventResult } from "../types";
import type { Config } from "../types/shared";
import { createAuction } from "./auctions";
import { reportEvent } from "./events";

export interface ClientOptions {
  transport: Transport;
  sdkVersion: string;
}

class TopsortClient {
  private config: Config;
  private createAuctionFn: ReturnType<typeof createAuction>;
  private reportEventFn: ReturnType<typeof reportEvent>;

  constructor(config: Config, options: ClientOptions) {
    this.config = { ...config, host: config.host ?? baseURL };
    const apiClient = new APIClient(options.transport, options.sdkVersion);
    this.createAuctionFn = createAuction(apiClient);
    this.reportEventFn = reportEvent(apiClient);
  }

  public async reportEvent(event: Event): Promise<EventResult> {
    return this.reportEventFn(event, this.config);
  }

  public async createAuction(auction: Auction): Promise<AuctionResult> {
    return this.createAuctionFn(auction, this.config);
  }
}

export { TopsortClient };
