export const baseURL = "https://api.topsort.com";

export const apis = {
  auctions: "v2/auctions",
  events: "v2/events",
};

export const retryableStatusCodes = [429, 500, 502, 503, 504];
