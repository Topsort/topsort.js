import { expect, test } from "@playwright/test";
import { assumedTag, installProviderFixture, openFixture } from "./helpers";

test("executes inside the exact banner root after consent in every supported browser", async ({
  page,
}) => {
  const requests = await installProviderFixture(page);
  await openFixture(page);
  const verificationTag = assumedTag("success", "cross-browser");

  const waiting = await page.evaluate(
    (tag) =>
      window.verificationFixture.renderBanners([
        {
          id: "banner-cross-browser",
          label: "Creative",
          renderKey: "render-1",
          verificationTag: tag,
        },
      ]),
    verificationTag,
  );
  expect(waiting.parseCount).toBe(0);
  expect(waiting.banners[0]?.scriptCount).toBe(0);
  expect(requests).toHaveLength(0);

  await page.evaluate(() => window.verificationFixture.setConsent("granted"));
  await expect
    .poll(async () => (await page.evaluate(() => window.verificationFixture.snapshot())).executions)
    .toHaveLength(1);

  const snapshot = await page.evaluate(() => window.verificationFixture.snapshot());
  expect(snapshot.parseCount).toBe(1);
  expect(snapshot.executions).toEqual([
    { frameId: null, rootId: "banner-cross-browser", scriptParentId: "banner-cross-browser" },
  ]);
  expect(snapshot.banners[0]).toMatchObject({
    id: "banner-cross-browser",
    interactive: true,
    scriptCount: 1,
    scriptParentIds: ["banner-cross-browser"],
  });
  expect(snapshot.diagnostics.map(({ code }) => code)).toEqual(["registered", "active"]);
});
