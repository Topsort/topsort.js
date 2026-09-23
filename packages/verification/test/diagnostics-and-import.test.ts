import { describe, expect, it } from "bun:test";
import type { ProviderStartHook } from "../src/runtime";
import type { VerificationDiagnostic } from "../src/types";
import {
  asHTMLElement,
  createTestRuntime,
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
    const runtime = createTestRuntime(
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

  it("treats an absent tag as a silent no-op", async () => {
    const diagnostics: VerificationDiagnostic[] = [];
    const consentSource = new MutableConsentSource("granted");
    const runtime = createTestRuntime(
      {
        consentSource,
        onDiagnostic: (event) => diagnostics.push(event),
      },
      { startProvider: new ImmediateProvider().start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "   ",
    });
    await settle();

    expect(diagnostics).toEqual([]);
    expect(consentSource.listeners.size).toBe(0);
  });

  it("emits registration-scoped diagnostics without exposing registration identity", async () => {
    const scoped: VerificationDiagnostic[] = [];
    const global: VerificationDiagnostic[] = [];
    const runtime = createTestRuntime(
      {
        consentSource: new MutableConsentSource("granted"),
        onDiagnostic: (event) => global.push(event),
      },
      { startProvider: new ImmediateProvider().start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
      onDiagnostic(event) {
        scoped.push(event);
        throw new Error("consumer diagnostic failure");
      },
    });
    await settle();

    expect(scoped.map(({ code }) => code)).toEqual(["registered", "active"]);
    expect(global.map(({ code }) => code)).toEqual(["registered", "active"]);
    expect(JSON.stringify(scoped)).not.toContain("render-1");
    expect(JSON.stringify(scoped)).not.toContain("tag");
  });

  it("diagnoses invalid registration inputs and use after runtime disposal", () => {
    const diagnostics: VerificationDiagnostic[] = [];
    const runtime = createTestRuntime(
      {
        consentSource: new MutableConsentSource("unknown"),
        onDiagnostic: (event) => diagnostics.push(event),
      },
      { startProvider: new ImmediateProvider().start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: null as unknown as HTMLElement,
      renderKey: "render-1",
      verificationTag: "tag",
    });
    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "   ",
      verificationTag: "tag",
    });
    runtime.dispose();
    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-2",
      verificationTag: "tag",
    });

    expect(diagnostics.map(({ code }) => code)).toEqual([
      "invalid_element",
      "invalid_render_key",
      "runtime_disposed",
    ]);
  });

  it("distinguishes a broken consent source from provider startup failure", () => {
    const diagnostics: VerificationDiagnostic[] = [];
    const runtime = createTestRuntime(
      {
        consentSource: {
          current() {
            throw new Error("consent unavailable");
          },
          subscribe() {
            return () => {};
          },
        },
        onDiagnostic: (event) => diagnostics.push(event),
      },
      { startProvider: new ImmediateProvider().start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });

    expect(diagnostics.map(({ code }) => code)).toEqual(["registered", "consent_source_failed"]);
  });

  it("keeps the public entrypoint import safe without browser globals", async () => {
    expect(globalThis.window).toBeUndefined();
    expect(globalThis.document).toBeUndefined();

    const entrypoint = await import("../src/index");

    expect(entrypoint.createVerificationRuntime).toBeFunction();
  });

  it("keeps the React entrypoint import safe without browser globals", async () => {
    expect(globalThis.window).toBeUndefined();
    expect(globalThis.document).toBeUndefined();

    const entrypoint = await import("../src/react");

    expect(entrypoint.useVerificationRef).toBeFunction();
  });
});
