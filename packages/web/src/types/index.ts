import type { Config as CoreConfig } from "@topsort/sdk-core";

export type {
  Auction,
  AuctionResult,
  ChannelType,
  Click,
  ClientOptions,
  DeviceType,
  Entity,
  Event,
  EventResult,
  Impression,
  InteractionObject,
  Item,
  Page,
  PageView,
  Placement,
  Purchase,
  Render,
  Transport,
  TransportRequest,
  TransportResponse,
} from "@topsort/sdk-core";

/** Web SDK config; fetchOptions are narrowed to fetch-compatible RequestInit. */
export interface Config extends Omit<CoreConfig, "fetchOptions"> {
  fetchOptions?: RequestInit;
}
