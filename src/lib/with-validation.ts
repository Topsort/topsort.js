import type { Config } from "../interfaces/shared.interface";
import { validateConfig } from "./validate-config";

export function withValidation<T extends Config, U, Args extends unknown[]>(
  fn: (config: T, ...args: Args) => Promise<U>,
): (config: T, ...args: Args) => Promise<U> {
  return async (config: T, ...args: Args): Promise<U> => {
    validateConfig(config);
    return fn(config, ...args);
  };
}
