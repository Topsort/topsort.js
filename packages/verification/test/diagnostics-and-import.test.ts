import { describe, expect, it } from "bun:test";
import type { ProviderStartHook } from "../src/provider";
import { createVerificationRuntimeInternal } from "../src/runtime";
import type { VerificationDiagnostic } from "../src/types";
import {
  asHTMLElement,
  ImmediateProvider,
  isTestElement,
  MutableConsentSource,
  settle,
  TestElement,
} from "./helpers";

describe("verification diagnostics and imports", () => {
  it("emits only the bounded diagnostic structure", async () => {
    const diagnostics: VerificationDiagnostic[] = [];
    const consentSource = new MutableConsentSource("granted");
    const startProvider: ProviderStartHook = async () => {
      throw new Error("https://example.test/?secret=raw-tag");
    };
    const runtime = createVerificationRuntimeInternal(
      {
        consentSource,
        onDiagnostic: (event) => diagnostics.push(event),
      },
      { startProvider, isHTMLElement: isTestElement, now: () => 100 },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "private-render-key",
      verificationTag: "https://example.test/?secret=raw-tag",
    });
    await settle();

    expect(diagnostics).toEqual([
      { code: "registered", provider: "ias", elapsedMs: 0 },
      { code: "provider_start_failed", provider: "ias", elapsedMs: 0 },
    ]);
    expect(consentSource.listeners.size).toBe(0);
  });

  it("redacts invalid tags and isolates diagnostic callback failures", async () => {
    const diagnostics: VerificationDiagnostic[] = [];
    const consentSource = new MutableConsentSource("granted");
    const runtime = createVerificationRuntimeInternal(
      {
        consentSource,
        onDiagnostic(event) {
          diagnostics.push(event);
          throw new Error("consumer diagnostic failure");
        },
      },
      { startProvider: new ImmediateProvider().start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "   ",
    });
    await settle();

    expect(diagnostics).toEqual([{ code: "invalid_tag", provider: "ias", elapsedMs: 0 }]);
    expect(consentSource.listeners.size).toBe(0);
  });

  it("keeps the public entrypoint import safe without browser globals", async () => {
    expect(globalThis.window).toBeUndefined();
    expect(globalThis.document).toBeUndefined();

    const entrypoint = await import("../src/index");

    expect(entrypoint.createVerificationRuntime).toBeFunction();
  });
});
