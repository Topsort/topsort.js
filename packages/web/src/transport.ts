import type { Transport, TransportRequest, TransportResponse } from "@topsort/sdk-core";

export const webTransport: Transport = {
  async request(url: string, init: TransportRequest): Promise<TransportResponse> {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: init.signal,
      keepalive: true,
      ...(init.options ?? {}),
    });

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      json: () => response.json(),
    };
  },
};
