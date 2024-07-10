import { version } from "../../package.json";
import { apis, baseURL } from "../constants/apis.constant";
import type { Config, TopsortEvent } from "../interfaces/events.interface";
import AppError from "../lib/app-error";

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
	try {
		const url = `${config.host || baseURL}/${apis.events}`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				// Can't use User-Agent header because of
				// https://bugs.chromium.org/p/chromium/issues/detail?id=571722
				"X-UA": `ts.js/${version}`,
				Authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify(event),
			// This parameter ensures in most browsers that the request is performed even in case the browser navigates to another page.
			keepalive: true,
		});

		return {
			ok: response.ok,
			retry: response.status === 429 || response.status >= 500,
		};
	} catch (error) {
		// Just leave this way for now, as we are wrapping up the skeleton
		throw new AppError(500, "", "");
	}
}
