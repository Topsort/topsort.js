// Core sanitizes request URLs with `new URL()` (see sdk-core api-client). RN's built-in
// URL implementation is incomplete, so this polyfill must load before any SDK request.
import "react-native-url-polyfill/auto";
import {
  buildFetchInit,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from "@topsort/sdk-core";

export const rnTransport: Transport = {
  async request(url: string, init: TransportRequest): Promise<TransportResponse> {
    const response = await fetch(url, buildFetchInit(init));

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      json: () => response.json(),
    };
  },
};
