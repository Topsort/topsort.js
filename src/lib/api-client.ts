import { version } from "../../package.json";
import type { Config } from "../types/shared";
import AppError from "./app-error";

class APIClient {
  private async handleResponse(response: Response): Promise<unknown> {
    let data: unknown;

    if (response.status !== 204) {
      data = await response.json();
    }

    if (!response.ok) {
      const retry = response.status === 429 || response.status >= 500;
      throw new AppError(response.status, response.statusText, data, retry);
    }

    return data;
  }

  private async request(endpoint: string, options: RequestInit): Promise<unknown> {
    try {
      const sanitizedUrl = this.sanitizeUrl(endpoint);
      const response = await fetch(sanitizedUrl, options);
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

  private sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.href.replace(/\/+$/, "");
    } catch (error) {
      throw new AppError(400, "Invalid URL", {
        error: `Invalid URL: ${error}`,
      });
    }
  }
}

export default new APIClient();
