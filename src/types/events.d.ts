import type { DeviceType } from "./shared";

/**
 * Channel through which the user interaction occurred.
 * Specifies where the event took place in relation to the marketplace.
 * @typedef {("onsite"|"offsite"|"instore")} ChannelType
 * @property {string} onsite - User is on the merchant's website or app
 * @property {string} offsite - User is on a third-party platform
 * @property {string} instore - User is in a physical store location
 * @example "onsite"
 * @example "offsite"
 * @example "instore"
 */
export type ChannelType = "onsite" | "offsite" | "instore";

/**
 * Base interface for all events.
 * Contains the minimum required fields for any event.
 * @interface BaseEvent
 */
interface BaseEvent {
  /**
   * A unique identifier for the request.
   * This field ensures the event reporting is idempotent in case there is a network issue and the request is retried.
   * If there is no event model on the marketplace side, generate a unique string that does not change if the event is resent.
   * @type {string}
   * @required
   * @example "eb874c98-bf4d-40a9-ae6d-fcf4cecb535c"
   */
  id: string;

  /**
   * A RFC3339 formatted timestamp including UTC offset.
   * Indicates the exact time when the event occurred.
   * @type {string}
   * @required
   * @format date-time
   * @example "2009-01-01T12:59:59-05:00"
   * @example "2019-01-01T12:59:59-05:00"
   */
  occurredAt: string;

  /**
   * The opaque user ID is an anonymized unique identifier that maps to the original user ID without revealing the original value.
   * This identifier allows Topsort to correlate user activity between auctions and user interactions, independent of the user's logged-in status.
   * For apps or sites where users might interact while logged out, we recommend generating a random identifier (UUIDv7) on the first load,
   * storing it on local storage (cookie, local storage, etc), and letting it live for at least a year.
   * Otherwise, if your users are always logged in for interactions, you may use a hash of your customer ID.
   * Correct purchase attribution requires long-lived opaque user IDs consistent between auction and event requests.
   * @type {string}
   * @required
   * @example "71303ce0-de89-496d-8270-6434589615e8"
   */
  opaqueUserId: string;
}

/**
 * Extended base event interface with additional attribution fields.
 * Used for impression and click events that may relate to sponsored content.
 * @interface AdditionalEventBase
 * @extends {BaseEvent}
 */
interface AdditionalEventBase extends BaseEvent {
  /**
   * Additional entity for attribution purposes.
   * Allows for more complex attribution scenarios.
   * @type {Entity}
   * @optional
   */
  additionalAttribution?: Entity;

  /**
   * If the event is over an ad promotion, this is the `resolvedBidId` field received from the `/auctions` request.
   * In most situations, especially when reporting a sponsored interaction, you'll want to fill in this field.
   * For organic events, use the `entity` field instead.
   * @type {string}
   * @optional
   * @example "WyJiX01mazE1IiwiMTJhNTU4MjgtOGVhZC00Mjk5LTgzMjctY2ViYjAwMmEwZmE4IiwibGlzdGluZ3MiLCJkZWZhdWx0IiwiIl0="
   */
  resolvedBidId?: string;
}

/**
 * Placement information describing where an interaction occurred.
 * For analytics purposes, you can use the `placement` field to differentiate different listings or banners.
 * @interface Placement
 */
export interface Placement {
  /**
   * An array of IDs of the categories associated to the page in which this event occurred, if applicable.
   * These IDs must match the IDs provided through the catalog service.
   * @type {string[]}
   * @optional
   * @minItems 1
   */
  categoryIds?: string[];

  /**
   * For paginated pages, this should indicate which page number triggered the event.
   * @type {number}
   * @optional
   * @minimum 1
   * @example 1
   */
  page?: number;

  /**
   * For paginated pages this should indicate how many items are in each result page.
   * @type {number}
   * @optional
   * @minimum 1
   * @example 15
   */
  pageSize?: number;

  /**
   * URL path of the page triggering the event.
   * For web apps, this can be obtained in JS using `window.location.pathname`.
   * For mobile apps, use the deep link for the current view, if available.
   * Otherwise, encode the view from which the event occurred in your app as a path-like string.
   * @type {string}
   * @required
   * @example "/categories/dairy"
   * @example "/root/categories/:categoryId"
   */
  path: string;

  /**
   * For components with multiple items (i.e. search results, similar products, etc),
   * this should indicate the index of a given item within that list.
   * @type {number}
   * @optional
   * @minimum 1
   */
  position?: number;

  /**
   * The ID of the product associated to the page in which this event occurred, if applicable.
   * This ID must match the ID provided through the catalog service.
   * @type {string}
   * @optional
   */
  productId?: string;

  /**
   * The search string provided by the user in the page where this event occurred, if applicable.
   * This search string must match the searchQuery field that was provided in the auction request (if provided).
   * @type {string}
   * @optional
   */
  searchQuery?: string;
}

/**
 * Entity is meant for reporting organic events, not sponsored or promoted products.
 * It refers to the object involved in the organic interaction.
 * Be aware that if `resolvedBidId` has any value, `entity` will be disregarded.
 * @interface Entity
 */
export interface Entity {
  /**
   * The marketplace's ID of the entity associated with the interaction.
   * @type {string}
   * @required
   */
  id: string;

  /**
   * The type of entity associated with the interaction.
   * @type {"product" | "vendor"}
   * @required
   * @example "product"
   * @example "vendor"
   */
  type: "product" | "vendor";
}

/**
 * An impression means a promotable has become visible to the consumer.
 * For promoted entities, include the `resolvedBidId` field from the `/v2/auctions` response.
 * For unpromoted entities, include the `entity` field to describe what was seen.
 * In case you cannot send an impression when the product becomes visible, send us an impression event
 * when the product was rendered in the HTML or, if that's also not possible, when your API returns the results.
 * @interface Impression
 * @extends {AdditionalEventBase}
 */
export interface Impression extends AdditionalEventBase {
  /**
   * Optional channel where the impression occurred.
   * @type {ChannelType}
   * @optional
   */
  channel?: ChannelType;

  /**
   * Optional device type used for the impression.
   * @type {DeviceType}
   * @optional
   */
  deviceType?: DeviceType;

  /**
   * Entity is meant for reporting organic events, not sponsored or promoted products.
   * Use this field when the impression is not related to an auction result.
   * @type {Entity}
   * @optional
   */
  entity?: Entity;

  /**
   * Placement information describing where the impression occurred.
   * @type {Placement}
   * @optional
   */
  placement?: Placement;
}

/**
 * A click is sent to Topsort when the consumer has clicked on a promotable.
 * For promoted entities, include the `resolvedBidId` field from the `/v2/auctions` response.
 * For unpromoted entities, include the `entity` field to describe what was clicked.
 * Topsort charges the vendor and pays the marketplace for clicks on ads in promoted placements on the marketplace app.
 * @interface Click
 * @extends {AdditionalEventBase}
 */
export interface Click extends AdditionalEventBase {
  /**
   * Optional channel where the click occurred.
   * @type {ChannelType}
   * @optional
   */
  channel?: ChannelType;

  /**
   * Optional device type used for the click.
   * @type {DeviceType}
   * @optional
   */
  deviceType?: DeviceType;

  /**
   * Entity is meant for reporting organic events, not sponsored or promoted products.
   * Use this field when the click is not related to an auction result.
   * @type {Entity}
   * @optional
   */
  entity?: Entity;

  /**
   * Placement information describing where the click occurred.
   * @type {Placement}
   * @optional
   */
  placement?: Placement;
}

/**
 * An item that was purchased in a transaction.
 * @interface Item
 */
export interface Item {
  /**
   * The marketplace ID of the product being purchased.
   * @type {string}
   * @required
   * @example "p_SA0238"
   */
  productId: string;

  /**
   * Amount of products purchased.
   * @type {number}
   * @required
   * @minimum 1
   * @default 1
   * @example 2
   */
  quantity: number;

  /**
   * The price of a single item in the marketplace currency.
   * @type {number}
   * @required
   * @example 12.95
   */
  unitPrice: number;

  /**
   * The vendor ID of the product being purchased.
   * This field is optional and should be filled in if:
   * 1. a product is sold by multiple vendors, or
   * 2. you want to use it for halo attribution
   * @type {string}
   * @optional
   * @example "v_8fj2D"
   */
  vendorId?: string;
}

/**
 * A purchase is sent to Topsort once a marketplace customer places an order.
 * These events are used to measure the effectiveness of an ad campaign.
 * @interface Purchase
 * @extends {BaseEvent}
 */
export interface Purchase extends BaseEvent {
  /**
   * Optional channel where the purchase occurred.
   * @type {ChannelType}
   * @optional
   */
  channel?: ChannelType;

  /**
   * Optional device type used for the purchase.
   * @type {DeviceType}
   * @optional
   */
  deviceType?: DeviceType;

  /**
   * Items purchased in this transaction.
   * @type {Item[]}
   * @required
   * @minItems 1
   */
  items: Item[];
}

/**
 * Base page interface containing common page properties.
 * @interface BasePage
 */
interface BasePage {
  /**
   * Identifies the page.
   * @type {string}
   * @required
   * @example "/category/electronics"
   */
  pageId: string;
}

/**
 * Standard page with a single value.
 * Used for most page types except cart pages.
 * @interface StandardPage
 * @extends {BasePage}
 */
interface StandardPage extends BasePage {
  /**
   * Type of page.
   * @type {"home" | "category" | "PDP" | "search" | "other"}
   * @required
   * @example "category"
   */
  type: "home" | "category" | "PDP" | "search" | "other";

  /**
   * Detail of the page, depending on the type.
   * For category pages, this would be the category identifier.
   * For search pages, this would be the search query.
   * For PDP pages, this would be the product identifier.
   * @type {string}
   * @required
   * @example "electronics"
   */
  value: string;
}

/**
 * Cart page with multiple product IDs.
 * Used specifically for cart pages where multiple items are present.
 * @interface CartPage
 * @extends {BasePage}
 */
interface CartPage extends BasePage {
  /**
   * Type of page, must be "cart" for this interface.
   * @type {"cart"}
   * @required
   */
  type: "cart";

  /**
   * Items on the cart.
   * Array of product IDs currently in the shopping cart.
   * @type {string[]}
   * @required
   * @minItems 1
   * @example ["coffee", "cookies", "apples"]
   */
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
 * A page view represents the navigation of the user throughout the page.
 * They are considered organic events.
 * In contrast to clicks or impressions, which are events within a page, a page view is the
 * interaction with the full page, which can contain multiple objects.
 * @interface PageView
 * @extends {BaseEvent}
 */
export interface PageView extends BaseEvent {
  /**
   * Channel through which the page was viewed.
   * @type {ChannelType}
   * @optional
   */
  channel?: ChannelType;

  /**
   * Type of device used to view the page.
   * @type {DeviceType}
   * @optional
   */
  deviceType?: DeviceType;

  /**
   * Page information describing which page was viewed.
   * @type {Page}
   * @required
   */
  page: Page;
}

/**
 * Main event request interface.
 * Contains arrays of different event types to be reported to Topsort.
 * Use the `/events` endpoint to report user interactions and activity on a marketplace.
 * @interface Event
 */
export interface Event {
  /**
   * Click events to report.
   * A user clicked on an asset.
   * @type {Click[]}
   * @optional
   * @minItems 0
   * @maxItems 50
   */
  clicks?: Click[];

  /**
   * Impression events to report.
   * A user viewed an asset.
   * @type {Impression[]}
   * @optional
   * @minItems 0
   * @maxItems 50
   */
  impressions?: Impression[];

  /**
   * PageView events to report.
   * A user visited a page.
   * @type {PageView[]}
   * @optional
   * @minItems 0
   * @maxItems 50
   */
  pageviews?: PageView[];

  /**
   * Purchase events to report.
   * A user created an order.
   * @type {Purchase[]}
   * @optional
   * @minItems 0
   * @maxItems 50
   */
  purchases?: Purchase[];
}

/**
 * Result of an event reporting request.
 * @interface EventResult
 */
export interface EventResult {
  /**
   * Indicates whether the event reporting was successful.
   * @type {boolean}
   * @required
   */
  ok: boolean;

  /**
   * Indicates whether the request should be retried in case of failure.
   * @type {boolean}
   * @required
   */
  retry: boolean;
}
