import {
  buildFetchInit,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "@topsort/sdk-core";

// Browsers reject keepalive requests once their in-flight bodies add up to more than 64 KiB.
// Larger bodies are sent without keepalive, leaving room for other requests in flight.
const KEEPALIVE_BODY_LIMIT_BYTES = 60 * 1024;

export const webTransport: Transport = {
  async request(url: string, init: TransportRequest): Promise<TransportResponse> {
    const keepalive = new TextEncoder().encode(init.body).byteLength <= KEEPALIVE_BODY_LIMIT_BYTES;
    const response = await fetch(url, { keepalive, ...buildFetchInit(init) });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      json: () => response.json(),
    };
  },
};
