import type { Auction, Config, Event } from "../src";

declare global {
  interface Window {
    sdk: {
      createAuction: (config: Config, auction: Auction) => Promise<unknown>;
      reportEvent: (config: Config, event: Event) => Promise<unknown>;
    };
  }
}
