import { apis, baseURL } from "../constants/apis.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import type { TopsortEvent } from "../types/events";
import type { Config } from "../types/shared";

/**
 * Reports an event to the Topsort API.
 *
 * @example
 * ```js
 * const config = { apiKey: "api-key" };
 * const event = { eventType: "test", eventData: {} };
 * const result = await reportEvent(config, event);
 * console.log(result); // { "ok": true }
 * ```
 *
 * @param config - The configuration object containing the API Key and optionally, the Host.
 * @param event - The event to report.
 * @returns {Promise<{ok: boolean}>} The result of the report, indicating success.
 */
async function handler(config: Config, event: TopsortEvent): Promise<{ ok: boolean }> {
  let url: URL;
  try {
    url = new URL(`${config.host || baseURL}/${apis.events}`);
  } catch (error) {
    throw new AppError(400, "Invalid URL", {
      error: `Invalid URL: ${config.host || baseURL}/${apis.events}`,
    });
  }

  await APIClient.post(url.toString(), event, config);

  return {
    ok: true,
  };
}

export const reportEvent = withValidation(handler);