type AuctionType = "banners" | "listings";
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

type AuctionWithCategoryAndProducts = {
  category: AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories;
  products: AuctionProduct;
  searchQuery?: never;
} & AuctionBaseFields;

type AuctionWithCategoryAndSearch = {
  category: AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories;
  products?: never;
  searchQuery: string;
} & AuctionBaseFields;

type AuctionWithProductsAndSearch = {
  category?: never;
  products: AuctionProduct;
  searchQuery: string;
} & AuctionBaseFields;

type AuctionWithCategoryOnly = {
  category: AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories;
  products?: never;
  searchQuery?: never;
} & AuctionBaseFields;

type AuctionWithProductsOnly = {
  category?: never;
  products: AuctionProduct;
  searchQuery?: never;
} & AuctionBaseFields;

type AuctionWithSearchOnly = {
  category?: never;
  products?: never;
  searchQuery: string;
} & AuctionBaseFields;

type AuctionWithNoConstraints = {
  category?: never;
  products?: never;
  searchQuery?: never;
} & AuctionBaseFields;

type AuctionBaseFields = {
  geoTargeting?: GeoTargeting;
  slots: number;
  type: AuctionType;
};

type ValidAuctionBase =
  | AuctionWithCategoryAndProducts
  | AuctionWithCategoryAndSearch
  | AuctionWithProductsAndSearch
  | AuctionWithCategoryOnly
  | AuctionWithProductsOnly
  | AuctionWithSearchOnly;

type ValidSponsoredListingAuction = ValidAuctionBase & {
  type: "listings";
};

type ValidBannerAuction = (ValidAuctionBase | AuctionWithNoConstraints) & {
  device?: DeviceType;
  slotId: string;
  type: "banners";
};

export interface Auction {
  auctions: (ValidSponsoredListingAuction | ValidBannerAuction)[];
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
