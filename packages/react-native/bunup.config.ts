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
});
