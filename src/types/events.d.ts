interface Placement {
  path: string;
  position?: number;
  page?: number;
  pageSize?: number;
  productId?: string;
  categoryIds?: string[];
  searchQuery?: string;
}

export interface Entity {
  type: "product" | "vendor";
  id: string;
}

interface Impression {
  occurredAt: string;
  opaqueUserId: string;
  id: string;
  resolvedBidId?: string;
  entity?: Entity;
  additionalAttribution?: Entity;
  placement?: Placement;
}

interface Click {
  resolvedBidId?: string;
  entity?: Entity;
  additionalAttribution?: Entity;
  placement?: Placement;
  occurredAt: string;
  opaqueUserId: string;
  id: string;
}

interface Item {
  productId: string;
  quantity: number;
  unitPrice: number;
  vendorId?: string;
}

interface Purchase {
  occurredAt: string;
  opaqueUserId: string;
  id: string;
  items: Item[];
}

export interface TopsortEvent {
  impressions?: Impression[];
  clicks?: Click[];
  purchases?: Purchase[];
}

export interface EventResult {
  ok: boolean;
  retry: boolean;
}
