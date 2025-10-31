import { DeviceType } from "./auctions";

export type ChannelType = "onsite" | "offsite" | "instore";
export type PageType = "home" | "category" | "PDP" | "search" | "cart" | "other";

interface BaseEvent {
  id: string;
  occurredAt: string;
  opaqueUserId: string;
}

interface AdditionalEventBase extends BaseEvent {
  additionalAttribution?: Entity;
  resolvedBidId?: string;
}

export interface Placement {
  categoryIds?: string[];
  page?: number;
  pageSize?: number;
  path: string;
  position?: number;
  productId?: string;
  searchQuery?: string;
}

export interface Entity {
  id: string;
  type: "product" | "vendor";
}

export interface Impression extends AdditionalEventBase {
  entity?: Entity;
  placement?: Placement;
}

export interface Click extends AdditionalEventBase {
  entity?: Entity;
  placement?: Placement;
}

export interface Item {
  productId: string;
  quantity: number;
  unitPrice: number;
  vendorId?: string;
}

export interface Purchase extends BaseEvent {
  items: Item[];
}

export interface Page {
  pageId: string;
  type: PageType;
  value: string | string[];
}

export interface PageView extends BaseEvent {
  channel?: ChannelType;
  deviceType?: DeviceType;
  page: Page;
}

export interface Event {
  clicks?: Click[];
  impressions?: Impression[];
  pageviews?: PageView[];
  purchases?: Purchase[];
}

export interface EventResult {
  ok: boolean;
  retry: boolean;
}
