import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  esbuildOptions(options) {
    options.globalName = "Topsort";
    options.keepNames = true;
  },
  format: ["cjs", "esm", "iife"],
  minify: true,
  publicDir: "e2e/public",
});
