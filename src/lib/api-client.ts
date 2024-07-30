import { version } from "../../package.json";
import { baseURL } from "../constants/apis.constant";
import type { Config } from "../types/shared";
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
      const retry = response.status === 429 || response.status >= 500;
      throw new AppError(response.status, response.statusText, data, retry);
    }

    return data;
  }

  private async request(endpoint: string, options: RequestInit): Promise<unknown> {
    try {
      const response = await fetch(`${endpoint ?? this.baseUrl}`, options);
      return this.handleResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new AppError(500, "Internal Server Error", message);
    }
  }

  private setupTimeoutSignal(config: Config): AbortSignal | undefined {
    if (config.timeout != null) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), config.timeout);
      return controller.signal;
    }
  }

  public async post(endpoint: string, body: unknown, config: Config): Promise<unknown> {
    const signal = this.setupTimeoutSignal(config);
    return this.request(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UA": config.userAgent
          ? `@topsort/sdk ${version} ${config.userAgent}`
          : `@topsort/sdk ${version}`,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  }
}

export default new APIClient(`${baseURL}`);
