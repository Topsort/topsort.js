interface Placement {
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

interface Impression {
  additionalAttribution?: Entity;
  entity?: Entity;
  id: string;
  occurredAt: string;
  opaqueUserId: string;
  placement?: Placement;
  resolvedBidId?: string;
}

interface Click {
  additionalAttribution?: Entity;
  entity?: Entity;
  id: string;
  occurredAt: string;
  opaqueUserId: string;
  placement?: Placement;
  resolvedBidId?: string;
}

interface Item {
  productId: string;
  quantity: number;
  unitPrice: number;
  vendorId?: string;
}

interface Purchase {
  id: string;
  items: Item[];
  occurredAt: string;
  opaqueUserId: string;
}

export interface TopsortEvent {
  clicks?: Click[];
  impressions?: Impression[];
  purchases?: Purchase[];
}

export interface EventResult {
  ok: boolean;
  retry: boolean;
}
