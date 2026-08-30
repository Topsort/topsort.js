import { describe, expect, it } from "bun:test";
import { parseHTML } from "linkedom";
import { ASSUMED_IAS_HOSTNAME, parseIasTag, startIasProvider } from "../src/providers/ias";
import { createVerificationRuntimeInternal } from "../src/runtime";
import type { VerificationDiagnosticCode } from "../src/types";
import { MutableConsentSource, settle } from "./helpers";

const tag = (attempt: string) =>
  `<script async src="https://${ASSUMED_IAS_HOSTNAME}/verification.js?attempt=${attempt}"></script>`;

function setup(resourceTimeoutMs = 1_000) {
  const { document } = parseHTML("<!doctype html><html><body></body></html>");
  const element = document.createElement("div");
  document.body.appendChild(element);
  const consentSource = new MutableConsentSource("granted");
  const diagnostics: VerificationDiagnosticCode[] = [];
  const runtime = createVerificationRuntimeInternal(
    {
      consentSource,
      onDiagnostic: ({ code }) => diagnostics.push(code),
    },
    {
      isHTMLElement: (value): value is HTMLElement => value === element,
      parseTag: parseIasTag,
      startProvider: ({ element: root, parsedTag }) =>
        startIasProvider({ element: root, parsedTag, resourceTimeoutMs }),
    },
  );

  return { consentSource, diagnostics, document, element, runtime };
}

function dispatch(script: HTMLScriptElement, type: "load" | "error"): void {
  const EventCtor = script.ownerDocument.defaultView?.Event;
  if (!EventCtor) throw new Error("fixture document is missing Event");
  script.dispatchEvent(new EventCtor(type));
}

describe("active diagnostic boundaries", () => {
  it("never emits active when the provider load fails", async () => {
    const { diagnostics, element, runtime } = setup();
    runtime.register({ element, renderKey: "load-failure", verificationTag: tag("failure") });
    const script = element.querySelector("script");
    expect(script).not.toBeNull();

    dispatch(script as HTMLScriptElement, "error");
    await settle();

    expect(diagnostics).toContain("provider_load_failed");
    expect(diagnostics).not.toContain("active");
  });

  it("never emits active when the provider times out", async () => {
    const { diagnostics, element, runtime } = setup(1);
    runtime.register({ element, renderKey: "timeout", verificationTag: tag("timeout") });

    await Bun.sleep(10);
    await settle();

    expect(diagnostics).toContain("provider_load_timeout");
    expect(diagnostics).not.toContain("active");
    expect(element.querySelector("script")).toBeNull();
  });

  it("never emits active after disposal before load", async () => {
    const { diagnostics, element, runtime } = setup();
    const handle = runtime.register({
      element,
      renderKey: "disposed",
      verificationTag: tag("disposed"),
    });
    const script = element.querySelector("script") as HTMLScriptElement;

    handle.dispose();
    dispatch(script, "load");
    await settle();

    expect(diagnostics).toContain("disposed");
    expect(diagnostics).not.toContain("active");
    expect(element.querySelector("script")).toBeNull();
  });

  it("never emits active from a registration replaced before load", async () => {
    const { diagnostics, element, runtime } = setup();
    runtime.register({ element, renderKey: "old", verificationTag: tag("old") });
    const staleScript = element.querySelector("script") as HTMLScriptElement;

    runtime.register({
      element,
      renderKey: "new",
      verificationTag: "<script>unsupported inline fixture</script>",
    });
    dispatch(staleScript, "load");
    await settle();

    expect(diagnostics).toContain("replaced_registration");
    expect(diagnostics).toContain("invalid_tag");
    expect(diagnostics).not.toContain("active");
  });

  it("never emits active after consent withdrawal before load", async () => {
    const { consentSource, diagnostics, element, runtime } = setup();
    runtime.register({ element, renderKey: "withdrawn", verificationTag: tag("withdrawn") });
    const script = element.querySelector("script") as HTMLScriptElement;

    consentSource.set("denied");
    dispatch(script, "load");
    await settle();

    expect(diagnostics).toContain("consent_withdrawn");
    expect(diagnostics).not.toContain("active");
    expect(element.querySelector("script")).toBeNull();
  });
});
