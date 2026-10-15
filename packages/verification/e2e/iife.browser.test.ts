import { expect, test } from "@playwright/test";
import type {
  ConsentSource,
  ConsentState,
  createVerificationRuntime,
  VerificationDiagnostic,
  VerificationHandle,
  VerificationRuntime,
} from "../src";
import { confirmedTag, installProviderFixture } from "./helpers";

interface IifeFixture {
  diagnostics: VerificationDiagnostic[];
  handle: VerificationHandle;
  listeners: Set<(state: ConsentState) => void>;
  runtime: VerificationRuntime;
  setConsent(state: ConsentState): void;
}

declare global {
  interface Window {
    TopsortVerification: Readonly<{
      createVerificationRuntime: typeof createVerificationRuntime;
    }>;
    iifeFixture?: IifeFixture;
  }
}

test("classic script exposes the base runtime and runs one exact-element registration", async ({
  page,
}) => {
  const providerRequests = await installProviderFixture(page);
  await page.goto("/iife.html");

  const publicKeys = await page.evaluate(() => Object.keys(window.TopsortVerification));
  expect(publicKeys).toEqual(["createVerificationRuntime"]);

  await page.evaluate((verificationTag) => {
    let consentState: ConsentState = "unknown";
    const listeners = new Set<(state: ConsentState) => void>();
    const diagnostics: VerificationDiagnostic[] = [];
    const consentSource: ConsentSource = {
      current: () => consentState,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
    const runtime = window.TopsortVerification.createVerificationRuntime({
      consentSource,
      onDiagnostic: (event) => diagnostics.push(event),
    });
    const element = document.querySelector<HTMLElement>("#iife-banner");
    if (!element) throw new Error("IIFE fixture banner is missing");
    const handle = runtime.register({
      verificationTag,
      renderKey: "iife-resolved-bid",
      element,
    });

    window.iifeFixture = {
      diagnostics,
      handle,
      listeners,
      runtime,
      setConsent(state) {
        consentState = state;
        for (const listener of [...listeners]) listener(state);
      },
    };
  }, confirmedTag());

  expect(providerRequests).toHaveLength(0);
  await expect(page.locator("#iife-banner > script")).toHaveCount(0);

  await page.evaluate(() => window.iifeFixture?.setConsent("granted"));
  await expect.poll(() => providerRequests.length).toBe(1);
  await expect(page.locator("#iife-banner > script")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.iifeFixture?.diagnostics.map(({ code }) => code) ?? []))
    .toContain("active");
  await expect(page.getByRole("button", { name: "Still interactive" })).toBeVisible();

  await page.evaluate(() => window.iifeFixture?.handle.dispose());
  await expect(page.locator("#iife-banner > script")).toHaveCount(0);
});
