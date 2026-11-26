import {
  buildFetchInit,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "@topsort/sdk-core";

export const webTransport: Transport = {
  async request(url: string, init: TransportRequest): Promise<TransportResponse> {
    const response = await fetch(url, { keepalive: true, ...buildFetchInit(init) });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      json: () => response.json(),
    };
  },
};
