import { defineConfig } from "bunup";

export default defineConfig({
  entry: "src/index.ts",
  name: "main",
  dts: {
    minify: false,
  },
  minify: true,
  format: ["esm", "cjs"],
});
