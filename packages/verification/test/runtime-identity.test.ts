import { describe, expect, it } from "bun:test";
import type { VerificationDiagnosticCode } from "../src/types";
import {
  asHTMLElement,
  createTestRuntime,
  ImmediateProvider,
  isTestElement,
  MutableConsentSource,
  settle,
  TestElement,
} from "./helpers";

describe("verification registration identity", () => {
  it("reuses the same element, render key, and edge-trimmed tag identity", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("granted");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createTestRuntime(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const element = asHTMLElement(new TestElement());

    const first = runtime.register({
      element,
      renderKey: "render-1",
      verificationTag: "  <script src='a'></script>  ",
    });
    const repeated = runtime.register({
      element,
      renderKey: "render-1",
      verificationTag: "<script src='a'></script>",
    });
    await settle();

    expect(repeated).toBe(first);
    expect(Object.keys(first)).toEqual(["dispose"]);
    expect(provider.starts).toHaveLength(1);
    expect(diagnostics).toEqual(["registered", "active"]);
  });

  it("replaces work when the key or semantic tag text changes", async () => {
    const provider = new ImmediateProvider();
    const runtime = createTestRuntime(
      { consentSource: new MutableConsentSource("granted") },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const element = asHTMLElement(new TestElement());

    runtime.register({
      element,
      renderKey: "render-1",
      verificationTag: "tag with spaces",
    });
    await settle();
    runtime.register({
      element,
      renderKey: "render-1",
      verificationTag: "tag  with spaces",
    });
    await settle();
    runtime.register({
      element,
      renderKey: "render-2",
      verificationTag: "tag  with spaces",
    });
    await settle();

    expect(provider.starts).toHaveLength(3);
    expect(provider.sessions.map((session) => session.disposeCalls)).toEqual([1, 1, 0]);
  });

  it("starts independent work for distinct elements with the same tag", async () => {
    const provider = new ImmediateProvider();
    const runtime = createTestRuntime(
      { consentSource: new MutableConsentSource("granted") },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "same-tag",
    });
    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "same-tag",
    });
    await settle();

    expect(provider.starts).toHaveLength(2);
    expect(provider.starts[0]?.element).not.toBe(provider.starts[1]?.element);
  });

  it("updates registration-scoped diagnostics without restarting the same tuple", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("unknown");
    const runtime = createTestRuntime(
      { consentSource },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const element = asHTMLElement(new TestElement());
    const first: VerificationDiagnosticCode[] = [];
    const second: VerificationDiagnosticCode[] = [];

    runtime.register({
      element,
      renderKey: "render-1",
      verificationTag: "same-tag",
      onDiagnostic: ({ code }) => first.push(code),
    });
    runtime.register({
      element,
      renderKey: "render-1",
      verificationTag: "same-tag",
      onDiagnostic: ({ code }) => second.push(code),
    });
    consentSource.set("granted");
    await settle();

    expect(first).toEqual(["registered"]);
    expect(second).toEqual(["active"]);
    expect(provider.starts).toHaveLength(1);
  });

  it("silently disposes an existing registration when its replacement has no tag", async () => {
    const provider = new ImmediateProvider();
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createTestRuntime(
      {
        consentSource: new MutableConsentSource("granted"),
        onDiagnostic: ({ code }) => diagnostics.push(code),
      },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const element = asHTMLElement(new TestElement());

    runtime.register({ element, renderKey: "render-1", verificationTag: "tag" });
    await settle();
    runtime.register({ element, renderKey: "render-2" });

    expect(provider.sessions[0]?.disposeCalls).toBe(1);
    expect(diagnostics).toEqual(["registered", "active", "replaced_registration"]);
  });
});
