export interface TransportRequest {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignal;
  options?: Record<string, unknown>;
}

export interface TransportResponse {
  status: number;
  statusText: string;
  ok: boolean;
  json(): Promise<unknown>;
}

export interface Transport {
  request(url: string, init: TransportRequest): Promise<TransportResponse>;
}
