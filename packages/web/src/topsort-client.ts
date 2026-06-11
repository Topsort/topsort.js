import CoreTopsortClient from "../../core/src/functions/topsort-client";
import type { Config } from "../../core/src/types/shared";
import { version } from "../package.json";
import { webTransport } from "./transport";

class TopsortClient extends CoreTopsortClient {
  constructor(config: Config) {
    super(config, { transport: webTransport, sdkVersion: version });
  }
}

export default TopsortClient;
