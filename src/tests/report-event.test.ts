import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { setupServer } from "msw/node";
import { apis, baseURL } from "../constants/apis.constant";
import { handlers, returnStatus } from "../constants/handlers.constant";
import { reportEvent } from "../functions/report-event";
import type { TopsortEvent } from "../interfaces/events.interface";

const server = setupServer(handlers.events, handlers.eventsError);

describe("reportEvent", () => {
	beforeAll(() => server.listen());
	afterAll(() => server.close());
	afterEach(() => server.resetHandlers());

	it("should handle permanent error", async () => {
		returnStatus(400, server, `${baseURL}/${apis.events}`);

		await expect(reportEvent({} as TopsortEvent, { apiKey: "apiKey" })).rejects.toEqual({
			status: 400,
			statusText: '',
			body: {}
		});
	});

	it("should handle authentication error", async () => {
		returnStatus(401, server, `${baseURL}/${apis.events}`);
		await expect(reportEvent({} as TopsortEvent, { apiKey: "apiKey" })).rejects.toEqual({
			status: 401,
			statusText: '',
			body: {}
		});
	});

	it("should handle retryable error", async () => {
		returnStatus(429, server, `${baseURL}/${apis.events}`);
		await expect(reportEvent({} as TopsortEvent, { apiKey: "apiKey" })).rejects.toEqual({
			status: 429,
			statusText: '',
			body: {}
		});
	});

	it("should handle server error", async () => {
		returnStatus(500, server, `${baseURL}/${apis.events}`);
		await expect(reportEvent({} as TopsortEvent, { apiKey: "apiKey" })).rejects.toEqual({
			status: 500,
			statusText: '',
			body: {}
		});
	});

	it("should handle custom url", async () => {
		returnStatus(200, server, `https://demo.api.topsort.com/${apis.events}`);
		await expect(
			reportEvent({} as TopsortEvent, {
				apiKey: "apiKey",
				host: "https://demo.api.topsort.com",
			}),
		).resolves.toEqual({ ok: true, retry: false });
	});
})