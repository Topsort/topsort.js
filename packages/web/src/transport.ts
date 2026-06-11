import type { Transport, TransportRequest, TransportResponse } from "../../core/src/lib/transport";

export const webTransport: Transport = {
  async request(url: string, init: TransportRequest): Promise<TransportResponse> {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: init.signal,
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
