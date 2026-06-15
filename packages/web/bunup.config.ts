import { defineConfig } from "bunup";
import { copy } from "bunup/plugins";

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
  plugins: [copy(["e2e/public/index.html"])],
});
