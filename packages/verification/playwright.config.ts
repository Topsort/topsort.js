import { defineConfig, devices } from "@playwright/test";

const VERIFICATION_FIXTURE_PORT = 4177;
export const verificationFixtureUrl = `http://127.0.0.1:${VERIFICATION_FIXTURE_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.browser.test.ts",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: verificationFixtureUrl,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "bun run serve:browser-fixture",
    port: VERIFICATION_FIXTURE_PORT,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
