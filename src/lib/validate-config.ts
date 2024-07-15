import type { Config } from "../interfaces/shared.interface";
import AppError from "./app-error";

export function validateConfig(config: Config): void {
  if (!config?.apiKey?.length) {
    throw new AppError(401, "API Key is required.", {});
  }
}
