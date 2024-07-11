import { apis, baseURL } from "../constants/apis.constant";
import type { Config, TopsortEvent } from "../interfaces/events.interface";
import APIClient from "../lib/api-client";

/**
 * Reports an event to the Topsort API.
 *
 * @example
 * ```js
 * const event = { eventType: "test", eventData: {} };
 * const config = { token: "my-token" };
 * const result = await reportEvent(event, config);
 * console.log(result); // { "ok": true, "retry": false }
 * ```
 *
 * @param event - The event to report.
 * @param config - The configuration object containing URL and token.
 * @returns {Promise<{ok: boolean, retry: boolean}>} The result of the report, indicating success and if a retry is needed.
 */
export async function reportEvent(
  event: TopsortEvent,
  config: Config,
): Promise<{ ok: boolean; retry: boolean }> {
  let url: URL;
  try {
    url = new URL(`${config.host || baseURL}/${apis.events}`);
  } catch (error) {
    throw new Error(`Invalid URL: ${config.host || baseURL}/${apis.events}`);
  }

  await APIClient.post(url.toString(), event, config);

  return {
    ok: true,
    retry: false,
  };
}