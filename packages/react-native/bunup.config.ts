import { defineConfig } from "bunup";

export default defineConfig({
  entry: "src/index.ts",
  name: "main",
  dts: {
    minify: false,
    resolve: ["@topsort/sdk-core"],
  },
  minify: true,
  format: ["esm", "cjs"],
  noExternal: ["@topsort/sdk-core"],
  // Optional peers / RN runtime — resolved by Metro at app runtime.
  external: [
    "react-native",
    "react-native-url-polyfill",
    "react-native-url-polyfill/auto",
    "@react-native-async-storage/async-storage",
    "@react-native-community/netinfo",
    "react-native-mmkv",
  ],
});
