import { createVerificationRuntime } from "./runtime";

const browserApi = Object.freeze({ createVerificationRuntime });

(
  globalThis as typeof globalThis & {
    TopsortVerification: typeof browserApi;
  }
).TopsortVerification = browserApi;
