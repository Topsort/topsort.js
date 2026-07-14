import { TopsortClient as CoreTopsortClient } from "@topsort/sdk-core";
import { version } from "../package.json";
import { webTransport } from "./transport";
import type { Config } from "./types";

export class TopsortClient extends CoreTopsortClient {
  constructor(config: Config) {
    super(config, { transport: webTransport, sdkVersion: version });
  }
}
