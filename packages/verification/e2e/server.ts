/** Dedicated browser fixture server. Its provider script is simulated and is not IAS code. */
import { file } from "bun";

export const VERIFICATION_FIXTURE_PORT = 4177;

const providerFixtureSource = `
(() => {
  // Simulated IAS-like fixture only. This is not confirmed provider behaviour.
  const script = document.currentScript;
  const root = script?.closest("[data-banner-root]") ?? null;
  const target = window.top ?? window;
  target.__verificationFixtureExecutions ??= [];
  target.__verificationFixtureExecutions.push({
    frameId: window.frameElement?.id ?? null,
    rootId: root?.id ?? null,
    scriptParentId: script?.parentElement?.id ?? null,
  });
})();
`;

function cspFor(requestUrl: URL): string {
  const providerSource =
    requestUrl.searchParams.get("csp") === "block" ? "" : " https://pixel.adsafeprotected.com";
  return [
    "default-src 'self'",
    `script-src 'self'${providerSource}`,
    "connect-src 'self'",
    "img-src 'self' data:",
    "frame-src 'self'",
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

Bun.serve({
  port: VERIFICATION_FIXTURE_PORT,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(file("./e2e/public/index.html"), {
        headers: { "Content-Security-Policy": cspFor(url) },
      });
    }
    if (url.pathname === "/fixture.js") {
      return new Response(file("./e2e/dist/fixture.js"), {
        headers: { "Content-Type": "text/javascript; charset=utf-8" },
      });
    }
    if (url.pathname === "/fixture-provider.js") {
      const mode = url.searchParams.get("mode") ?? "success";
      if (mode === "failure") {
        return new Response("simulated provider failure", { status: 503 });
      }
      if (mode === "delay" || mode === "timeout") {
        const fallback = mode === "timeout" ? 5_500 : 300;
        const delayMs = Number(url.searchParams.get("delayMs") ?? fallback);
        await Bun.sleep(Number.isFinite(delayMs) ? delayMs : fallback);
      }
      return new Response(providerFixtureSource, {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "text/javascript; charset=utf-8",
          "X-Verification-Fixture": "simulated-provider",
        },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
});
