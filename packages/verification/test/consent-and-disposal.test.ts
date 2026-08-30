import { describe, expect, it } from "bun:test";
import { createVerificationRuntimeInternal } from "../src/runtime";
import type { VerificationDiagnosticCode } from "../src/types";
import {
  asHTMLElement,
  ImmediateProvider,
  isTestElement,
  MutableConsentSource,
  settle,
  TestElement,
} from "./helpers";

describe("verification consent and disposal", () => {
  it("waits for unknown consent, then starts once after a grant", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("unknown");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createVerificationRuntimeInternal(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    await settle();

    expect(diagnostics).toEqual(["registered"]);
    expect(provider.starts).toHaveLength(0);
    expect(consentSource.listeners.size).toBe(1);

    consentSource.set("granted");
    await settle();
    consentSource.set("granted");
    await settle();

    expect(provider.starts).toHaveLength(1);
    expect(diagnostics).toEqual(["registered", "active"]);
  });

  it("terminates denied consent without starting or retaining a subscription", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("denied");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createVerificationRuntimeInternal(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    await settle();

    expect(provider.starts).toHaveLength(0);
    expect(consentSource.listeners.size).toBe(0);
    expect(diagnostics).toEqual(["registered", "consent_denied"]);
  });

  it("treats consent loss after activation as terminal and cleans its session", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("granted");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createVerificationRuntimeInternal(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    await settle();
    consentSource.set("unknown");

    expect(provider.sessions[0]?.disposeCalls).toBe(1);
    expect(consentSource.listeners.size).toBe(0);
    expect(diagnostics).toEqual(["registered", "active", "consent_withdrawn"]);
    consentSource.set("granted");
    await settle();
    expect(provider.starts).toHaveLength(1);
  });

  it("fails a disconnected element without polling for attachment", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("granted");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createVerificationRuntimeInternal(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );

    runtime.register({
      element: asHTMLElement(new TestElement(false)),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    await settle();

    expect(provider.starts).toHaveLength(0);
    expect(consentSource.listeners.size).toBe(0);
    expect(diagnostics).toEqual(["registered", "element_not_ready"]);
  });

  it("disposes handles and the runtime idempotently", async () => {
    const provider = new ImmediateProvider();
    const consentSource = new MutableConsentSource("granted");
    const runtime = createVerificationRuntimeInternal(
      { consentSource },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const first = runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag-1",
    });
    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-2",
      verificationTag: "tag-2",
    });
    await settle();

    first.dispose();
    first.dispose();
    runtime.dispose();
    runtime.dispose();

    expect(provider.sessions.map((session) => session.disposeCalls)).toEqual([1, 1]);
    expect(consentSource.listeners.size).toBe(0);
  });
});
