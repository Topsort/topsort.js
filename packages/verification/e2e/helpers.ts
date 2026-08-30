/** Helpers for the simulated provider browser fixture; no behaviour here is confirmed IAS behaviour. */
import type { Page } from "@playwright/test";

export const fixtureOrigin = "http://127.0.0.1:4177";

export function assumedTag(
  mode: "success" | "delay" | "network" | "timeout" = "success",
  attempt = "default",
  secret = "fixture-query-must-not-leak",
): string {
  return `<script async src="https://pixel.adsafeprotected.com/verification.js?fixtureMode=${mode}&attempt=${attempt}&secret=${secret}"></script>`;
}

export async function installProviderFixture(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route("https://pixel.adsafeprotected.com/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    requests.push(requestUrl.href);
    const mode = requestUrl.searchParams.get("fixtureMode") ?? "success";
    if (mode === "network") {
      await route.abort("connectionfailed");
      return;
    }

    const fixtureUrl = new URL("/fixture-provider.js", fixtureOrigin);
    fixtureUrl.searchParams.set("mode", mode);
    const delayMs = requestUrl.searchParams.get("delayMs");
    if (delayMs) fixtureUrl.searchParams.set("delayMs", delayMs);
    const response = await fetch(fixtureUrl);
    await route.fulfill({
      status: response.status,
      body: await response.text(),
      contentType: response.headers.get("content-type") ?? "text/javascript",
      headers: {
        "Cache-Control": response.headers.get("cache-control") ?? "no-store",
        "X-Verification-Fixture": "simulated-provider",
      },
    });
  });
  return requests;
}

export async function openFixture(page: Page, csp: "allow" | "block" = "allow"): Promise<void> {
  await page.goto(`/?csp=${csp}`);
  await page.waitForFunction(() => typeof window.verificationFixture === "object");
}

export async function grantConsent(page: Page): Promise<void> {
  await page.evaluate(() => window.verificationFixture.setConsent("granted"));
}
