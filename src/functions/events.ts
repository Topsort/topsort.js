import { apis, baseURL } from "../constants/apis.constant";
import APIClient from "../lib/api-client";
import AppError from "../lib/app-error";
import { withValidation } from "../lib/with-validation";
import type { EventResult, TopsortEvent } from "../types/events";
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
 * @returns {Promise<EventResult>} The result of the report, indicating success.
 */
async function handler(config: Config, event: TopsortEvent): Promise<EventResult> {
  let url: URL;
  try {
    url = new URL(`${config.host || baseURL}/${apis.events}`);
  } catch (error) {
    throw new AppError(400, "Invalid URL", {
      error: `Invalid URL: ${config.host || baseURL}/${apis.events}`,
    });
  }

  try {
    await APIClient.post(url.toString(), event, config);
    return { ok: true, retry: false };
  } catch (error) {
    if (error instanceof AppError && error.retry) {
      return { ok: false, retry: true };
    }
    throw error;
  }
}

export const reportEvent = withValidation(handler);
