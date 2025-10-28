import { defineConfig } from "bunup";
import { copy } from "bunup/plugins";

export default defineConfig({
  entry: "src/index.ts",
  name: "main",
  dts: {
    minify: true,
  },
  minify: true,
  format: ["esm", "cjs"],
  plugins: [copy(["e2e/public/index.html"])],
});
