import { describe, expect, it } from "bun:test";
import type { VerificationDiagnosticCode } from "../src/types";
import {
  asHTMLElement,
  ControlledProvider,
  createTestRuntime,
  FakeSession,
  isTestElement,
  MutableConsentSource,
  settle,
  TestElement,
} from "./helpers";

describe("verification async race containment", () => {
  it("cannot revive a registration disposed during provider startup", async () => {
    const provider = new ControlledProvider();
    const consentSource = new MutableConsentSource("granted");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createTestRuntime(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const handle = runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    const staleSession = new FakeSession();

    handle.dispose();
    provider.pending[0]?.resolve(staleSession);
    await settle();

    expect(staleSession.disposeCalls).toBe(1);
    expect(consentSource.listeners.size).toBe(0);
    expect(diagnostics).toEqual(["registered", "disposed"]);
  });

  it("makes consent loss during provider startup terminal", async () => {
    const provider = new ControlledProvider();
    const consentSource = new MutableConsentSource("granted");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createTestRuntime(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    const staleSession = new FakeSession();

    expect(provider.pending).toHaveLength(1);
    consentSource.set("unknown");
    provider.pending[0]?.resolve(staleSession);
    await settle();

    expect(staleSession.disposeCalls).toBe(1);
    expect(consentSource.listeners.size).toBe(0);
    expect(diagnostics).toEqual(["registered", "consent_withdrawn"]);

    consentSource.set("granted");
    expect(provider.pending).toHaveLength(1);
    expect(diagnostics).toEqual(["registered", "consent_withdrawn"]);
  });

  it("cannot revive work superseded on the same element", async () => {
    const provider = new ControlledProvider();
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createTestRuntime(
      {
        consentSource: new MutableConsentSource("granted"),
        onDiagnostic: ({ code }) => diagnostics.push(code),
      },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    const element = asHTMLElement(new TestElement());
    runtime.register({ element, renderKey: "first", verificationTag: "tag" });
    runtime.register({ element, renderKey: "second", verificationTag: "tag" });
    const staleSession = new FakeSession();
    const currentSession = new FakeSession();

    provider.pending[0]?.resolve(staleSession);
    provider.pending[1]?.resolve(currentSession);
    await settle();

    expect(staleSession.disposeCalls).toBe(1);
    expect(currentSession.disposeCalls).toBe(0);
    expect(diagnostics).toEqual(["registered", "replaced_registration", "registered", "active"]);
  });

  it("cannot revive a registration denied during provider startup", async () => {
    const provider = new ControlledProvider();
    const consentSource = new MutableConsentSource("granted");
    const diagnostics: VerificationDiagnosticCode[] = [];
    const runtime = createTestRuntime(
      { consentSource, onDiagnostic: ({ code }) => diagnostics.push(code) },
      { startProvider: provider.start, isHTMLElement: isTestElement },
    );
    runtime.register({
      element: asHTMLElement(new TestElement()),
      renderKey: "render-1",
      verificationTag: "tag",
    });
    const staleSession = new FakeSession();

    consentSource.set("denied");
    provider.pending[0]?.resolve(staleSession);
    await settle();

    expect(staleSession.disposeCalls).toBe(1);
    expect(consentSource.listeners.size).toBe(0);
    expect(diagnostics).toEqual(["registered", "consent_withdrawn"]);
  });
});
