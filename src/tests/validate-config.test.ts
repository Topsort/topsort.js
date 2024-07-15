import type { Config } from "../interfaces/shared.interface";
import { validateConfig } from "../lib/validate-config";

import AppError from "../lib/app-error";

describe("validateConfig", () => {
  it("should throw an error if apiKey is missing", () => {
    const config: Config = {
      apiKey: undefined as unknown as string,
    };

    expect(() => validateConfig(config)).toThrow(AppError);
  });

  it("should not throw an error if apiKey is provided", () => {
    const config = {
      apiKey: "some-api-key",
    };

    expect(() => validateConfig(config)).not.toThrow();
  });
});
