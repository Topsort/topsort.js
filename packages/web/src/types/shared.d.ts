/**
 * Type of device used for the interaction.
 * @typedef {("desktop"|"mobile")} DeviceType
 * @property {string} desktop - Desktop computer or laptop
 * @property {string} mobile - Mobile device (smartphone or tablet)
 * @example "mobile"
 * @example "desktop"
 */
export type DeviceType = "desktop" | "mobile";

/**
 * Configuration options for the Topsort client.
 * @interface Config
 */
export interface Config {
  /**
   * The API key to use for requests.
   * A valid API key generated in Topsort's UI is required for authentication.
   * @type {string}
   * @required
   */
  apiKey: string;

  /**
   * An optional alternative host to use for requests.
   * Defaults to the standard Topsort API endpoint if not provided.
   * @type {string}
   * @optional
   * @example "https://api.topsort.com"
   */
  host?: string;

  /**
   * An optional timeout for requests in milliseconds.
   * Specifies how long to wait for a request to complete before timing out.
   * @type {number}
   * @optional
   * @example 5000
   */
  timeout?: number;

  /**
   * Optional custom user agent string to use for requests.
   * Allows identification of the client making the requests.
   * @type {string}
   * @optional
   * @example "MyApp/1.0.0"
   */
  userAgent?: string;

  /**
   * Optional fetch options to pass to the fetch call.
   * Defaults to { keepalive: true }.
   * Allows customization of the underlying HTTP request behavior.
   * @type {RequestInit}
   * @optional
   * @default { keepalive: true }
   */
  fetchOptions?: RequestInit;
}
