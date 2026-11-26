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
    if (!response.ok) {
      // Gateways can answer with an empty or HTML body, so the error body is best effort.
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = undefined;
      }
      const retry = response.status === 408 || response.status === 429 || response.status >= 500;
      throw new AppError(response.status, response.statusText, data, retry);
    }

    if (response.status === 204) {
      return undefined;
    }

    try {
      return await response.json();
    } catch (error) {
      throw new AppError(500, "Internal Server Error", errorMessage(error));
    }
  }

  private async request(endpoint: string, options: TransportRequest): Promise<unknown> {
    const sanitizedUrl = this.sanitizeUrl(endpoint);
    let response: TransportResponse;
    try {
      response = await this.transport.request(sanitizedUrl, options);
    } catch (error) {
      // Network failures and timeouts mean no response arrived, so the request can be retried.
      throw new AppError(500, "Internal Server Error", errorMessage(error), true);
    }
    return this.handleResponse(response);
  }

  // A caller signal in fetchOptions also aborts the timeout signal, so either one cancels the request.
  private setupTimeoutSignal(config: Config): AbortSignal | undefined {
    if (config.timeout != null) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), config.timeout);
      const callerSignal = config.fetchOptions?.signal as AbortSignal | undefined;
      if (callerSignal?.aborted) {
        controller.abort();
      } else {
        callerSignal?.addEventListener("abort", () => controller.abort());
      }
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export default APIClient;
