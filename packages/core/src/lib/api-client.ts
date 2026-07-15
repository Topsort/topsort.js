import type { Config } from "../types/shared";
import AppError from "./app-error";
import type { Transport, TransportRequest, TransportResponse } from "./transport";

class APIClient {
  constructor(
    private transport: Transport,
    private sdkVersion: string,
    private sdkPackageName = "@topsort/sdk",
  ) {}

  private async handleResponse(response: TransportResponse): Promise<unknown> {
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

  private async request(endpoint: string, options: TransportRequest): Promise<unknown> {
    try {
      const sanitizedUrl = this.sanitizeUrl(endpoint);
      const response = await this.transport.request(sanitizedUrl, options);
      return await this.handleResponse(response);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
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
          ? `${this.sdkPackageName} ${this.sdkVersion} ${config.userAgent}`
          : `${this.sdkPackageName} ${this.sdkVersion}`,
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
      options: config.fetchOptions,
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

export default APIClient;
