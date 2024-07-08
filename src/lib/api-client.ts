import { baseURL } from "../constants/apis.constant";
import AppError from "./app-error";

class APIClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	private async handleResponse(response: Response): Promise<unknown> {
		const contentType = response.headers.get("Content-Type") || "";
		let data: unknown;
		if (contentType.includes("application/json")) {
			data = await response.json();
		} else {
			data = await response.text();
		}

		if (!response.ok) {
			throw new AppError(response.status, response.statusText, data);
		}

		return data;
	}

	private async request(
		endpoint: string,
		options: RequestInit,
	): Promise<unknown> {
		try {
			const response = await fetch(`${this.baseUrl}${endpoint}`, options);
			return await this.handleResponse(response);
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}

			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new AppError(500, 'Internal server error', message);
		}
	}

	public async get(endpoint: string): Promise<unknown> {
		return this.request(endpoint, {
			method: "GET",
		});
	}

	public async post(endpoint: string, body: unknown): Promise<unknown> {
		return this.request(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	}
}

export default new APIClient(`${baseURL}`)
