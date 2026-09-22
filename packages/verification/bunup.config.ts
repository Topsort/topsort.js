import { defineConfig } from "bunup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: {
    minify: false,
  },
  format: ["esm"],
  minify: true,
  splitting: false,
});
