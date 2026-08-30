import { expect, test } from "@playwright/test";
import { assumedTag, grantConsent, installProviderFixture, openFixture } from "./helpers";

test.beforeEach(async ({ browserName }) => {
  test.skip(browserName !== "chromium", "The detailed lifecycle matrix runs in Chromium.");
});

test("denied consent never parses or requests the provider", async ({ page }) => {
  const requests = await installProviderFixture(page);
  await openFixture(page);
  await page.evaluate(
    (tag) =>
      window.verificationFixture.renderBanners([
        { id: "denied", label: "Creative", renderKey: "denied", verificationTag: tag },
      ]),
    assumedTag("success", "denied"),
  );

  const snapshot = await page.evaluate(() => window.verificationFixture.setConsent("denied"));
  expect(snapshot.parseCount).toBe(0);
  expect(snapshot.executions).toHaveLength(0);
  expect(snapshot.diagnostics.map(({ code }) => code)).toEqual(["registered", "consent_denied"]);
  expect(requests).toHaveLength(0);
});

test("two banners with the same tag execute independently", async ({ page }) => {
  await installProviderFixture(page);
  await openFixture(page);
  await grantConsent(page);
  const verificationTag = assumedTag("success", "shared-tag");
  await page.evaluate(
    (tag) =>
      window.verificationFixture.renderBanners([
        { id: "banner-a", label: "A", renderKey: "render-a", verificationTag: tag },
        { id: "banner-b", label: "B", renderKey: "render-b", verificationTag: tag },
      ]),
    verificationTag,
  );

  await expect
    .poll(async () => (await page.evaluate(() => window.verificationFixture.snapshot())).executions)
    .toHaveLength(2);
  const snapshot = await page.evaluate(() => window.verificationFixture.snapshot());
  expect(snapshot.executions.map(({ rootId }) => rootId).sort()).toEqual(["banner-a", "banner-b"]);
  expect(snapshot.diagnostics.filter(({ code }) => code === "active")).toHaveLength(2);
});

test("React rerenders deduplicate the same tuple and replace a changed render key", async ({
  page,
}) => {
  await installProviderFixture(page);
  await openFixture(page);
  await grantConsent(page);
  const verificationTag = assumedTag("success", "rerender");
  const render = (renderKey: string, label: string) =>
    page.evaluate(
      ({ key, tag, text }) =>
        window.verificationFixture.renderBanners([
          { id: "rerender", label: text, renderKey: key, verificationTag: tag },
        ]),
      { key: renderKey, label, tag: verificationTag, text: label },
    );

  await render("render-1", "First");
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.verificationFixture.snapshot())).executions.length,
    )
    .toBe(1);
  await page.evaluate(() => {
    (window as Window & { __fixtureScriptBefore?: HTMLScriptElement }).__fixtureScriptBefore =
      document.querySelector("#rerender script") ?? undefined;
  });

  await render("render-1", "Ordinary rerender");
  const sameTuple = await page.evaluate(() => ({
    executionCount: window.verificationFixture.snapshot().executions.length,
    scriptPreserved:
      (window as Window & { __fixtureScriptBefore?: HTMLScriptElement }).__fixtureScriptBefore ===
      document.querySelector("#rerender script"),
    scriptInsideRoot: document.querySelector("#rerender script")?.parentElement?.id,
  }));
  expect(sameTuple).toEqual({
    executionCount: 1,
    scriptPreserved: true,
    scriptInsideRoot: "rerender",
  });

  await render("render-2", "Replacement");
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.verificationFixture.snapshot())).executions.length,
    )
    .toBe(2);
  const replaced = await page.evaluate(() => window.verificationFixture.snapshot());
  expect(replaced.banners[0]?.scriptCount).toBe(1);
  expect(replaced.diagnostics.map(({ code }) => code)).toEqual([
    "registered",
    "active",
    "disposed",
    "registered",
    "active",
  ]);
});

test("React ref detachment disposes and removes package-owned nodes", async ({ page }) => {
  await installProviderFixture(page);
  await openFixture(page);
  await grantConsent(page);
  await page.evaluate(
    (tag) =>
      window.verificationFixture.renderBanners([
        { id: "unmount", label: "Unmount", renderKey: "unmount", verificationTag: tag },
      ]),
    assumedTag("success", "unmount"),
  );
  await expect(page.locator("#unmount script")).toHaveCount(1);

  const snapshot = await page.evaluate(() => window.verificationFixture.unmountAll());
  expect(snapshot.banners).toHaveLength(0);
  expect(snapshot.consentSubscribers).toBe(0);
  expect(snapshot.diagnostics.map(({ code }) => code)).toContain("disposed");
  expect(await page.locator("[data-banner-root] script").count()).toBe(0);
});

for (const failure of ["invalid", "csp", "network", "timeout"] as const) {
  test(`${failure} failure leaves the creative present and interactive`, async ({ page }) => {
    const requests = await installProviderFixture(page);
    await openFixture(page, failure === "csp" ? "block" : "allow");
    await grantConsent(page);
    const verificationTag =
      failure === "invalid"
        ? "<script>unsupported inline fixture</script>"
        : assumedTag(failure === "csp" ? "success" : failure, failure);

    await page.evaluate(
      (tag) =>
        window.verificationFixture.renderBanners([
          { id: "failure", label: "Still interactive", renderKey: "failure", verificationTag: tag },
        ]),
      verificationTag,
    );
    const expectedCode =
      failure === "invalid"
        ? "invalid_tag"
        : failure === "timeout"
          ? "provider_load_timeout"
          : "provider_load_failed";
    await expect
      .poll(async () =>
        (await page.evaluate(() => window.verificationFixture.snapshot())).diagnostics.map(
          ({ code }) => code,
        ),
      )
      .toContain(expectedCode);

    await page.getByRole("button", { name: /Still interactive/ }).click();
    await expect(page.getByRole("button", { name: /Still interactive: 1/ })).toBeVisible();
    await expect(page.locator("#failure")).toBeVisible();
    const snapshot = await page.evaluate(() => window.verificationFixture.snapshot());
    expect(snapshot.diagnostics.map(({ code }) => code)).not.toContain("active");
    if (failure === "invalid") expect(requests).toHaveLength(0);
  });
}

for (const cancellation of ["disposal", "replacement", "consent withdrawal"] as const) {
  test(`${cancellation} before delayed load prevents active`, async ({ page }) => {
    const requests = await installProviderFixture(page);
    await openFixture(page);
    await grantConsent(page);
    await page.evaluate(
      (tag) =>
        window.verificationFixture.renderBanners([
          { id: "delayed", label: "Delayed", renderKey: "old", verificationTag: tag },
        ]),
      assumedTag("delay", `${cancellation}-old`),
    );
    await expect.poll(() => requests.length).toBe(1);

    if (cancellation === "disposal") {
      await page.evaluate(() => window.verificationFixture.disposeRuntime());
    } else if (cancellation === "replacement") {
      await page.evaluate(() =>
        window.verificationFixture.renderBanners([
          {
            id: "delayed",
            label: "Replacement",
            renderKey: "new",
            verificationTag: "<script>unsupported replacement fixture</script>",
          },
        ]),
      );
    } else {
      await page.evaluate(() => window.verificationFixture.setConsent("denied"));
    }

    await page.waitForTimeout(700);
    const snapshot = await page.evaluate(() => window.verificationFixture.snapshot());
    expect(snapshot.diagnostics.map(({ code }) => code)).not.toContain("active");
  });
}

test("diagnostics never contain the raw tag or URL query", async ({ page }) => {
  await installProviderFixture(page);
  await openFixture(page);
  await grantConsent(page);
  const secret = "sensitive-fixture-query-123";
  const verificationTag = assumedTag("network", "redaction", secret);
  await page.evaluate(
    (tag) =>
      window.verificationFixture.renderBanners([
        { id: "redaction", label: "Redaction", renderKey: "redaction", verificationTag: tag },
      ]),
    verificationTag,
  );
  await expect
    .poll(async () =>
      (await page.evaluate(() => window.verificationFixture.snapshot())).diagnostics.map(
        ({ code }) => code,
      ),
    )
    .toContain("provider_load_failed");

  const serialized = await page.evaluate(() =>
    JSON.stringify(window.verificationFixture.snapshot().diagnostics),
  );
  expect(serialized).not.toContain(verificationTag);
  expect(serialized).not.toContain(secret);
  expect(serialized).not.toContain("verification.js?");
});

test("accepts and binds an element from a same-origin iframe realm", async ({ page }) => {
  await installProviderFixture(page);
  await openFixture(page);
  await grantConsent(page);
  await page.evaluate(
    (tag) =>
      window.verificationFixture.registerIframe({
        id: "foreign-realm",
        label: "Iframe creative",
        renderKey: "foreign-realm",
        verificationTag: tag,
      }),
    assumedTag("success", "foreign-realm"),
  );
  await expect
    .poll(async () => (await page.evaluate(() => window.verificationFixture.snapshot())).executions)
    .toHaveLength(1);

  const execution = (await page.evaluate(() => window.verificationFixture.snapshot()))
    .executions[0];
  expect(execution).toEqual({
    frameId: "frame-foreign-realm",
    rootId: "foreign-realm",
    scriptParentId: "foreign-realm",
  });
  const frame = page.frameLocator("#frame-foreign-realm");
  await expect(frame.locator("#foreign-realm script")).toHaveCount(1);
  await expect(frame.getByRole("button", { name: "Iframe creative" })).toBeVisible();
});
