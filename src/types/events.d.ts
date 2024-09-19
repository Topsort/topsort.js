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

export interface Impression {
  additionalAttribution?: Entity;
  entity?: Entity;
  id: string;
  occurredAt: string;
  opaqueUserId: string;
  placement?: Placement;
  resolvedBidId?: string;
}

export interface Click {
  additionalAttribution?: Entity;
  entity?: Entity;
  id: string;
  occurredAt: string;
  opaqueUserId: string;
  placement?: Placement;
  resolvedBidId?: string;
}

export interface Item {
  productId: string;
  quantity: number;
  unitPrice: number;
  vendorId?: string;
}

export interface Purchase {
  id: string;
  items: Item[];
  occurredAt: string;
  opaqueUserId: string;
}

export interface Event {
  clicks?: Click[];
  impressions?: Impression[];
  purchases?: Purchase[];
}

export interface EventResult {
  ok: boolean;
  retry: boolean;
}
