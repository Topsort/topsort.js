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
	qualityScores: number[];
}

interface AuctionBase {
	type: AuctionType;
	slots: number;
	category?: AuctionSingleCategory | AuctionMultipleCategories | AuctionDisjunctiveCategories;
	searchQuery?: string;
	products?: AuctionProduct;
	geoTargeting?: GeoTargeting;
}

interface SponsoredListingAuction extends AuctionBase {
	type: "listings";
}

interface BannerAuction extends AuctionBase {
	type: "banners";
	device: DeviceType;
	slotId: string;
}

export interface TopsortAuction {
	auctions: (SponsoredListingAuction | BannerAuction)[];
}

interface Asset {
	url: string;
}

interface Winner {
	rank: number;
	asset: Asset[];
	type: string;
	id: string;
	resolvedBidId: string;
}

interface Result {
	resultType: AuctionType;
	winners: Winner[];
	error: boolean;
}

export interface AuctionResult {
	results: Result[];
}