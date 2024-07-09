import { http, HttpResponse } from "msw";
import type { SetupServerApi } from "msw/node";
import { apis, baseURL } from "./apis.constant";

const errorBaseURL = "https://error.api.topsort.com/";

export const handlers = {
	events: http.post(`${baseURL}/${apis.events}`, () => {
		return HttpResponse.json({}, { status: 200 });
	}),
	eventsError: http.post(`${errorBaseURL}/${apis.events}`, () => {
		return HttpResponse.error();
	}),
};

export const returnStatus = (status: number, server: SetupServerApi, url: string) => {
	return server.use(
		http.post(url, () => {
			return HttpResponse.json({}, { status: status });
		}),
	);
};
