import { version } from "../../package.json";
import { Config, TopsortEvent } from "../interfaces/events.interface";

/**
 * Reports an event to the Topsort API.
 * 
 * @example
 * ```js
 * const event = { eventType: "test", eventData: {} };
 * const config = { token: "my-token" };
 * const result = await reportEvent(event, config);
 * console.log(result); // { ok: true, retry: false }
 * ```
 * 
 * @param {TopsortEvent} e - The event to report.
 * @param {Config} config - The configuration object containing URL and token.
 * @returns {Promise<{ok: boolean, retry: boolean}>} The result of the report, indicating success and if a retry is needed.
 */
export async function reportEvent(e: TopsortEvent, config: Config): Promise<{ ok: boolean, retry: boolean }> {
  try {
    const url = (config.url || "https://api.topsort.com") + "/v2/events";
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Can't use User-Agent header because of
        // https://bugs.chromium.org/p/chromium/issues/detail?id=571722
        "X-UA": `ts.js/${version}`,
        Authorization: "Bearer " + config.token,
      },
      body: JSON.stringify(e),
      // This parameter ensures in most browsers that the request is performed even in case the browser navigates to another page.
      keepalive: true,
    });
    return { ok: r.ok, retry: r.status === 429 || r.status >= 500 };
  } catch (error) {
    console.error("Error reporting event:", error);
    return { ok: false, retry: true };
  }
}