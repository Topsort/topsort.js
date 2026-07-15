import { TopsortClient as CoreTopsortClient } from "@topsort/sdk-core";
import { version } from "../package.json";
import { rnTransport } from "./transport";
import type { Config } from "./types";

export class TopsortClient extends CoreTopsortClient {
  constructor(config: Config) {
    super(config, {
      transport: rnTransport,
      sdkVersion: version,
      sdkPackageName: "@topsort/react-native-sdk",
    });
  }
}
