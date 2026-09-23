/** Helpers for the controlled IAS bootstrap browser fixture; no real IAS code runs here. */
import type { Page } from "@playwright/test";

export const fixtureOrigin = "http://127.0.0.1:4177";
const iasOrigin = "https://staticjs.adsafeprotected.com";
const pubEntityByMode = {
  success: "96261444",
  delay: "96261445",
  network: "96261446",
  slow: "96261447",
} as const;

export function confirmedTag(
  mode: "success" | "delay" | "network" | "slow" = "success",
  attempt = "default",
): string {
  const advEntityId = `3072912${attempt.replace(/\D/g, "").slice(0, 4)}`;
  const src = `${iasOrigin}/fw.js?advEntityId=${advEntityId || "3072912"}&pubEntityId=${pubEntityByMode[mode]}`;
  return `<script type="application/javascript" src="${src}"></script>`;
}

export async function installProviderFixture(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route(`${iasOrigin}/fw.js?**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    requests.push(requestUrl.href);
    const pubEntityId = requestUrl.searchParams.get("pubEntityId");
    const mode =
      (Object.entries(pubEntityByMode).find(([, value]) => value === pubEntityId)?.[0] as
        | keyof typeof pubEntityByMode
        | undefined) ?? "success";
    if (mode === "network") {
      await route.abort("connectionfailed");
      return;
    }

    const fixtureUrl = new URL("/fixture-provider.js", fixtureOrigin);
    fixtureUrl.searchParams.set("mode", mode);
    const response = await fetch(fixtureUrl);
    try {
      await route.fulfill({
        status: response.status,
        body: await response.text(),
        contentType: response.headers.get("content-type") ?? "text/javascript",
        headers: {
          "Cache-Control": response.headers.get("cache-control") ?? "no-store",
          "X-Verification-Fixture": "simulated-provider",
        },
      });
    } catch (error) {
      // Disposal tests intentionally remove the script while this fixture is delayed.
      // Browsers may cancel that request before the delayed response is ready to be fulfilled.
      if (route.request().failure() !== null || page.isClosed()) return;
      throw error;
    }
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
