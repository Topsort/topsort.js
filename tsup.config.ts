import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm", "iife"],
  dts: true,
  clean: true,
  minify: true,
  esbuildOptions(options) {
    options.keepNames = true;
    options.globalName = "Topsort"
  },
});
