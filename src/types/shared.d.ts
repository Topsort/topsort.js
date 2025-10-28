export interface Config {
  /// The API key to use for requests.
  apiKey: string;
  /// An optional alternative host to use for requests.
  host?: string;
  /// An optional timeout for requests in milliseconds.
  timeout?: number;
  userAgent?: string;
  /// Optional fetch options to pass to the fetch call. Defaults to { keepalive: true }.
  fetchOptions?: RequestInit;
  /// Optional custom fetch implementation to replace the default fetch.
  /// Useful for using libraries like axios or adding custom middleware.
  customFetch?: (url: string, options?: RequestInit) => Promise<Response>;
}
