/**
 * Browser-only test fixture for the provisional IAS-like adapter contract.
 * Nothing in this file represents confirmed IAS behaviour.
 */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createVerificationRuntime } from "../src";
import { useVerificationRef } from "../src/react";
import type {
  ConsentSource,
  ConsentState,
  VerificationDiagnostic,
  VerificationHandle,
} from "../src/types";

interface BannerInput {
  id: string;
  label: string;
  renderKey: string;
  verificationTag?: string | null;
}

interface FixtureExecution {
  frameId: string | null;
  rootId: string | null;
  scriptParentId: string | null;
}

interface FixtureSnapshot {
  banners: Array<{
    id: string;
    interactive: boolean;
    scriptCount: number;
    scriptParentIds: Array<string | null>;
  }>;
  consentSubscribers: number;
  diagnostics: VerificationDiagnostic[];
  executions: FixtureExecution[];
  parseCount: number;
}

declare global {
  interface Window {
    __verificationFixtureExecutions: FixtureExecution[];
    verificationFixture: {
      disposeRuntime(): void;
      registerIframe(input: BannerInput): Promise<FixtureSnapshot>;
      renderBanners(banners: BannerInput[]): Promise<FixtureSnapshot>;
      setConsent(state: ConsentState): Promise<FixtureSnapshot>;
      snapshot(): FixtureSnapshot;
      unmountAll(): Promise<FixtureSnapshot>;
    };
  }
}

class MutableConsentSource implements ConsentSource {
  private readonly listeners = new Set<(state: ConsentState) => void>();

  constructor(private state: ConsentState = "unknown") {}

  current(): ConsentState {
    return this.state;
  }

  subscribe(listener: (state: ConsentState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  set(state: ConsentState): void {
    this.state = state;
    for (const listener of [...this.listeners]) listener(state);
  }

  subscriberCount(): number {
    return this.listeners.size;
  }
}

const diagnostics: VerificationDiagnostic[] = [];
const consentSource = new MutableConsentSource();
const runtime = createVerificationRuntime({
  consentSource,
  onDiagnostic: (event) => diagnostics.push(event),
});
const iframeHandles: VerificationHandle[] = [];
window.__verificationFixtureExecutions = [];

let parseCount = 0;
const NativeDOMParser = window.DOMParser;
const CountingDOMParser = new Proxy(NativeDOMParser, {
  construct(Target, args) {
    parseCount += 1;
    return Reflect.construct(Target, args);
  },
});
Object.defineProperty(window, "DOMParser", {
  value: CountingDOMParser,
  configurable: true,
  writable: true,
});

function Banner({ id, label, renderKey, verificationTag }: BannerInput) {
  const [clicks, setClicks] = useState(0);
  const ref = useVerificationRef(runtime, { verificationTag, renderKey });
  return (
    <article id={id} data-banner-root={id} ref={ref}>
      <button
        type="button"
        data-creative-control={id}
        onClick={() => setClicks((value) => value + 1)}
      >
        {label}: {clicks}
      </button>
    </article>
  );
}

function App({ banners }: { banners: BannerInput[] }) {
  return (
    <>
      {banners.map((banner) => (
        <Banner key={banner.id} {...banner} />
      ))}
    </>
  );
}

const appRoot = document.querySelector("#app");
if (!(appRoot instanceof HTMLElement)) throw new Error("fixture app root missing");
const reactRoot = createRoot(appRoot);

async function settleDom(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function snapshot(): FixtureSnapshot {
  const banners = [...document.querySelectorAll<HTMLElement>("[data-banner-root]")].map(
    (element) => {
      const scripts = [...element.querySelectorAll("script")];
      return {
        id: element.id,
        interactive: element.querySelector("button") instanceof HTMLButtonElement,
        scriptCount: scripts.length,
        scriptParentIds: scripts.map((script) => script.parentElement?.id ?? null),
      };
    },
  );
  return {
    banners,
    consentSubscribers: consentSource.subscriberCount(),
    diagnostics: [...diagnostics],
    executions: [...window.__verificationFixtureExecutions],
    parseCount,
  };
}

window.verificationFixture = {
  async renderBanners(banners) {
    reactRoot.render(<App banners={banners} />);
    await settleDom();
    return snapshot();
  },
  async setConsent(state) {
    consentSource.set(state);
    await settleDom();
    return snapshot();
  },
  async unmountAll() {
    reactRoot.render(<App banners={[]} />);
    await settleDom();
    return snapshot();
  },
  disposeRuntime() {
    runtime.dispose();
    for (const handle of iframeHandles.splice(0)) handle.dispose();
  },
  async registerIframe(input) {
    const iframe = document.createElement("iframe");
    iframe.id = `frame-${input.id}`;
    iframe.src = "about:blank";
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) => {
      if (iframe.contentDocument?.readyState === "complete") resolve();
      else iframe.addEventListener("load", () => resolve(), { once: true });
    });

    const iframeDocument = iframe.contentDocument;
    if (!iframeDocument) throw new Error("fixture iframe document unavailable");
    const banner = iframeDocument.createElement("article");
    banner.id = input.id;
    banner.dataset.bannerRoot = input.id;
    const button = iframeDocument.createElement("button");
    button.type = "button";
    button.textContent = input.label;
    banner.appendChild(button);
    iframeDocument.body.appendChild(banner);
    iframeHandles.push(
      runtime.register({
        element: banner,
        renderKey: input.renderKey,
        verificationTag: input.verificationTag ?? "",
      }),
    );
    await settleDom();
    return snapshot();
  },
  snapshot,
};
