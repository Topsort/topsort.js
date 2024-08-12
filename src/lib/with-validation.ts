import { Config } from "../types/shared";
import { validateConfig } from "./validate-config";

export function withValidation<T extends Config, U, Args extends unknown[]>(
  fn: (...args: [...Args, T]) => Promise<U>
): (...args: [...Args, T]) => Promise<U> {
  return async (...args: [...Args, T]): Promise<U> => {
    const config = args[args.length - 1] as T;
    validateConfig(config);

    return fn(...args);
  };
}
