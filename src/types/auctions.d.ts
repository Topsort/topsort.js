type AuctionType = "banners" | "listings" | "videos";
type DeviceType = "desktop" | "mobile";

interface GeoTargeting {
  location: string;
}

interface AuctionSingleCategory {
  id: string;
}

interface AuctionMultipleCategories {
  ids: string[];
}

interface AuctionDisjunctiveCategories {
  disjunctions: string[][];
}

interface AuctionProduct {
  ids: string[];
  qualityScores?: number[];
}

interface AuctionBase {
  category?: AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories;
  geoTargeting?: GeoTargeting;
  products?: AuctionProduct;
  searchQuery?: string;
  slots: number;
  type: AuctionType;
}

interface SponsoredListingAuction extends AuctionBase {
  type: "listings";
}

interface BannerAuction extends AuctionBase {
  device?: DeviceType;
  slotId: string;
  type: "banners";
}

interface VideoAuction extends AuctionBase {
  device?: DeviceType;
  slotId: string;
  type: "videos";
}

export interface Auction {
  auctions: (SponsoredListingAuction | BannerAuction | VideoAuction)[];
}

interface Asset {
  url: string;
}

interface Winner {
  asset: Asset[];
  id: string;
  rank: number;
  resolvedBidId: string;
  type: string;
}

interface Result {
  error: boolean;
  resultType: AuctionType;
  winners: Winner[];
}

export interface AuctionResult {
  results: Result[];
}
