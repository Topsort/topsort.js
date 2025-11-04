import type { DeviceType } from "./auctions";

/**
 * Channel through which the user interaction occurred.
 * @typedef {("onsite"|"offsite"|"instore")} ChannelType
 * @property {string} onsite - User is on the merchant's website
 * @property {string} offsite - User is on a third-party platform
 * @property {string} instore - User is in a physical store location
 */
export type ChannelType = "onsite" | "offsite" | "instore";

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

interface BasePage {
  pageId: string;
}

interface StandardPage extends BasePage {
  type: "home" | "category" | "PDP" | "search" | "other";
  value: string;
}

interface CartPage extends BasePage {
  type: "cart";
  value: string[];
}

/**
 * Page information for a pageview event.
 * Use StandardPage for single-value pages or CartPage for cart pages with multiple product IDs.
 * @typedef {(StandardPage|CartPage)} Page
 */
export type Page = StandardPage | CartPage;

/**
 * PageView event - tracks when a user views a page.
 * @interface PageView
 * @extends {BaseEvent}
 * @property {ChannelType} [channel] - Channel through which the page was viewed
 * @property {DeviceType} [deviceType] - Type of device used
 * @property {Page} page - Page information
 */
export interface PageView extends BaseEvent {
  channel?: ChannelType;
  deviceType?: DeviceType;
  page: Page;
}

export interface Event {
  clicks?: Click[];
  impressions?: Impression[];
  /**
   * PageView events
   * @type {PageView[]}
   */
  pageviews?: PageView[];
  purchases?: Purchase[];
}

export interface EventResult {
  ok: boolean;
  retry: boolean;
}
