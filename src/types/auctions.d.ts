import type { DeviceType } from "./shared";

/**
 * Type of auction to run.
 * @typedef {("banners"|"listings")} AuctionType
 * @property {string} banners - Banner ads auction for display advertising
 * @property {string} listings - Sponsored listings auction for product promotions
 */
type AuctionType = "banners" | "listings";

/**
 * Geographical information associated with this auction.
 * @interface GeoTargeting
 */
interface GeoTargeting {
  /**
   * The location this auction is being run for.
   * @type {string}
   * @example "New York"
   */
  location: string;
}

/**
 * A single category for the purpose of running an auction.
 * @interface AuctionSingleCategory
 */
interface AuctionSingleCategory {
  /**
   * The category ID of the bids that will participate in an auction.
   * @type {string}
   * @example "c_yogurt"
   */
  id: string;
}

/**
 * A set of categories for the purpose of running an auction.
 * In order to participate in an auction, a bid product must belong to all of the categories provided.
 * @interface AuctionMultipleCategories
 */
interface AuctionMultipleCategories {
  /**
   * An array containing the category IDs of the bids that will participate in an auction.
   * In order to participate in an auction, a bid product must belong to all of the categories provided.
   * @type {string[]}
   * @example ["c_men_clothing", "c_shoes"]
   */
  ids: string[];
}

/**
 * Multiple disjunctions of categories for the purpose of running an auction.
 * A bid product must belong to at least one category in each disjunction to participate.
 * @interface AuctionDisjunctiveCategories
 */
interface AuctionDisjunctiveCategories {
  /**
   * An array of disjunctions.
   * In order to participate in an auction, a bid product must belong to at least one of the categories
   * of the disjunction provided in the auction request.
   * @type {string[][]}
   * @minItems 1
   * @maxItems 5
   * @example [["c_red", "c_blue"], ["c_large", "c_medium"]]
   */
  disjunctions: string[][];
}

/**
 * List of products for the purpose of running an auction.
 * @interface AuctionProduct
 */
interface AuctionProduct {
  /**
   * An array of product IDs that should participate in the auction.
   * We recommend sending no more than 500 products per auction.
   * These IDs must match those in the catalog integration with Topsort.
   * @type {string[]}
   * @minItems 1
   * @maxItems 10000
   * @example ["p_PJbnN", "p_ojng4", "p_8VKDt", "p_Mfk15"]
   */
  ids: string[];

  /**
   * An array of marketplace defined quality scores, each corresponding to the product ID with matching array index.
   * If given, these values will be combined with internal quality scores to provide a score
   * that better represents the relevance of the participating products.
   * Note that the length of this array must be the same as the length of the `ids` array.
   * Values must be between 0 and 1.
   * @type {number[]}
   * @optional
   * @minItems 1
   * @maxItems 10000
   * @example [0.75, 0.82, 0.91, 0.68]
   */
  qualityScores?: number[];
}

/**
 * Base interface for all auction types.
 * Describes the intent of running an auction.
 * @interface AuctionBase
 */
interface AuctionBase {
  /**
   * Category filter for the auction.
   * Can be a single category, multiple categories, or disjunctive categories.
   * Exactly one of: products, category, or searchQuery should be set depending on the auction context.
   * @type {AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories}
   * @optional
   */
  category?: AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories;

  /**
   * Geographical information associated with this auction.
   * @type {GeoTargeting}
   * @optional
   */
  geoTargeting?: GeoTargeting;

  /**
   * List of products that should participate in the auction.
   * @type {AuctionProduct}
   * @optional
   */
  products?: AuctionProduct;

  /**
   * The search string provided by a user.
   * Used for keyword-based auction targeting.
   * @type {string}
   * @optional
   * @example "vanilla yogurt"
   */
  searchQuery?: string;

  /**
   * Specifies the maximum number of auction winners that should be returned.
   * @type {number}
   * @required
   * @minimum 1
   * @example 2
   */
  slots: number;

  /**
   * Discriminator for the type of auction.
   * @type {AuctionType}
   * @required
   */
  type: AuctionType;
}

/**
 * Describes the intent of running a sponsored listings auction.
 * Ideal for product listing pages and search results.
 * @interface SponsoredListingAuction
 * @extends {AuctionBase}
 */
interface SponsoredListingAuction extends AuctionBase {
  /**
   * Discriminator for sponsored listings auction type.
   * @type {"listings"}
   * @required
   */
  type: "listings";
}

/**
 * Describes the intent of running a banner ads auction.
 * For Landing Page banners, `category` and `searchQuery` must be empty.
 * For Category banners, the `category` field must be set.
 * For Keywords banners, the `searchQuery` field must be set.
 * @interface BannerAuction
 * @extends {AuctionBase}
 */
interface BannerAuction extends AuctionBase {
  /**
   * The device for which the ads are meant for.
   * @type {DeviceType}
   * @optional
   * @default "desktop"
   */
  device?: DeviceType;

  /**
   * The ID of the banner placement for which this auction will be run for.
   * This must be a valid slot ID configured in your marketplace.
   * @type {string}
   * @required
   * @example "categories-ribbon-banner"
   */
  slotId: string;

  /**
   * Discriminator for banner auction type.
   * @type {"banners"}
   * @required
   */
  type: "banners";
}

/**
 * Main auction request interface.
 * Each batch of auction requests can be a combination of sponsored listing auctions and banner auctions.
 * @interface Auction
 */
export interface Auction {
  /**
   * Array of auction requests to be processed.
   * Topsort will run an auction for each batched auction request.
   * @type {(SponsoredListingAuction | BannerAuction)[]}
   * @required
   * @minItems 1
   * @maxItems 5
   */
  auctions: (SponsoredListingAuction | BannerAuction)[];
}

/**
 * A source available for an asset (banner or video).
 * @interface Asset
 */
interface Asset {
  /**
   * A vendor provided asset that the marketplace has to use as a banner.
   * The asset will be served by Topsort's CDN.
   * @type {string}
   * @required
   * @format uri
   * @example "https://cdn.topsort.com/assets/example-banner.jpg"
   */
  url: string;

  /**
   * Additional content metadata for the asset.
   * This is an open object that can contain any additional properties.
   * @type {Record<string, any>}
   * @optional
   * @example { "headingText": "Summer Sale", "bannerText": "50% off", "bannerTextColour": "#FFFFFF", "heroImage": "hero.jpg", "heroImageAltText": "Hero" }
   */
  // biome-ignore lint: this comes from the specification
  content?: Record<string, any>;
}

/**
 * Base interface for auction winners.
 * @interface BaseWinner
 */
interface BaseWinner {
  /**
   * The marketplace's ID of the winning entity, depending on the target of the campaign.
   * @type {string}
   * @required
   * @example "p_Mfk15"
   */
  id: string;

  /**
   * Where the product's bid ranked in the auction.
   * One-based, so the product with rank 1 won the auction.
   * In an auction response, the winners array is sorted so rank will match the entry's index.
   * @type {number}
   * @required
   * @minimum 1
   * @example 1
   */
  rank: number;

  /**
   * An opaque Topsort ID to be used when this item is interacted with.
   * This must be included in impression and click events for proper attribution.
   * @type {string}
   * @required
   * @example "WyJiX01mazE1IiwiMTJhNTU4MjgtOGVhZC00Mjk5LTgzMjctY2ViYjAwMmEwZmE4IiwibGlzdGluZ3MiLCJkZWZhdWx0IiwiIl0="
   */
  resolvedBidId: string;

  /**
   * The target type of the winning bid.
   * @type {string}
   * @required
   * @enum ["product", "vendor", "brand", "url"]
   * @example "product"
   */
  type: string;

  /**
   * The ID of the campaign that won the auction.
   * @type {string}
   * @required
   * @example "82588593-85c5-47c0-b125-07e315b7f2b3"
   */
  campaignId: string;
}

/**
 * Represents a sponsored listing auction winner.
 * @interface SponsoredListingWinner
 * @extends {BaseWinner}
 */
interface SponsoredListingWinner extends BaseWinner {}

/**
 * Represents a banner auction winner with asset information.
 * @interface BannerWinner
 * @extends {BaseWinner}
 */
interface BannerWinner extends BaseWinner {
  /**
   * The list of available sources for a banner.
   * Only present for banner auction winners.
   * @type {Asset[]}
   * @required
   * @minItems 1
   */
  asset: Asset[];
}

/**
 * Union type for all winner types.
 * @typedef {(SponsoredListingWinner|BannerWinner)} Winner
 */
type Winner = SponsoredListingWinner | BannerWinner;

/**
 * Result for a single auction.
 * @interface Result
 */
interface Result {
  /**
   * A boolean indicating whether this auction was resolved successfully.
   * @type {boolean}
   * @required
   * @example false
   */
  error: boolean;

  /**
   * The type of auction result.
   * Discriminator for the result type.
   * @type {AuctionType}
   * @required
   */
  resultType: AuctionType;

  /**
   * Array of winner objects in order from highest to lowest bid.
   * It will be empty if there were no qualifying bids or if there was an error.
   * The list of winners will contain at most `slots` entries per auction.
   * It may contain fewer or no entries at all if there aren't enough products with usable bids.
   * Winners for listings auctions will be SponsoredListingWinner objects.
   * Winners for banner auctions will be BannerWinner objects with asset information.
   * @type {Winner[]}
   * @required
   */
  winners: Winner[];
}

/**
 * The auction results response.
 * Contains results for all auctions requested in the batch.
 * @interface AuctionResult
 */
export interface AuctionResult {
  /**
   * Array of auction results, one for each auction in the request.
   * @type {Result[]}
   * @required
   * @minItems 1
   * @maxItems 5
   */
  results: Result[];
}
