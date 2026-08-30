import { describe, expect, it } from "bun:test";
import { parseHTML } from "linkedom";
import {
  ASSUMED_IAS_HOSTNAME,
  type ParsedIasTag,
  parseIasTag,
  startIasProvider,
} from "../src/providers/ias";
import { createVerificationRuntimeInternal } from "../src/runtime";
import type { ConsentSource } from "../src/types";
import { MutableConsentSource, settle } from "./helpers";

function doc() {
  return parseHTML("<!doctype html><html><body></body></html>").document;
}

const valid = `<script async src="https://${ASSUMED_IAS_HOSTNAME}/verification.js?placement=abc"></script>`;

const granted: ConsentSource = {
  current: () => "granted",
  subscribe: () => () => {},
};

describe("assumed IAS adapter", () => {
  it("parses and canonicalizes the narrow external script shape", () => {
    const parsed = parseIasTag(`  ${valid}  `, doc());
    expect(parsed).toEqual({
      src: `https://${ASSUMED_IAS_HOSTNAME}/verification.js?placement=abc`,
      async: true,
      identity: `ias-script:https://${ASSUMED_IAS_HOSTNAME}/verification.js?placement=abc`,
    });
  });

  it.each([
    "<script>evil()</script>",
    `<script async src="http://${ASSUMED_IAS_HOSTNAME}/x"></script>`,
    `<script async src="https://not-${ASSUMED_IAS_HOSTNAME}/x"></script>`,
    `<script async src="https://user:pass@${ASSUMED_IAS_HOSTNAME}/x"></script>`,
    `<script async src="https://${ASSUMED_IAS_HOSTNAME}/x"></script><script async src="https://${ASSUMED_IAS_HOSTNAME}/y"></script>`,
    `<script async src="https://${ASSUMED_IAS_HOSTNAME}/x" onload="evil()"></script>`,
    `<img src="https://${ASSUMED_IAS_HOSTNAME}/x">`,
  ])("rejects unsupported or unsafe markup: %s", (tag) => {
    expect(() => parseIasTag(tag, doc())).toThrow();
  });

  it("inserts one package-owned script into the exact supplied element", () => {
    const document = doc();
    const root = document.createElement("div");
    const parsed: ParsedIasTag = parseIasTag(valid, document);
    const session = startIasProvider({ element: root, parsedTag: parsed });
    const script = root.querySelector("script");

    expect(script).not.toBeNull();
    expect(script?.parentNode).toBe(root);
    expect(document.head.querySelector("script")).toBeNull();

    session.dispose();
    expect(root.querySelector("script")).toBeNull();
  });

  it("executes independently for two distinct elements with the same tag", () => {
    const document = doc();
    const parsed = parseIasTag(valid, document);
    const first = startIasProvider({
      element: document.createElement("div"),
      parsedTag: parsed,
    });
    const second = startIasProvider({
      element: document.createElement("div"),
      parsedTag: parsed,
    });

    expect(first).not.toBe(second);
    expect(first).toHaveProperty("settled");
    expect(second).toHaveProperty("settled");
    first.dispose();
    second.dispose();
  });

  it("reports a resource failure without rejecting the caller's render path", async () => {
    const document = doc();
    const root = document.createElement("div");
    const session = startIasProvider({
      element: root,
      parsedTag: parseIasTag(valid, document),
    });
    const script = root.querySelector("script");
    const EventCtor = document.defaultView?.Event;
    if (script && EventCtor) script.dispatchEvent(new EventCtor("error"));

    await expect(session.settled).rejects.toMatchObject({ code: "provider_load_failed" });
    expect(root.querySelector("script")).toBeNull();
  });

  it("defers parsing until consent is granted", async () => {
    const document = doc();
    const root = document.createElement("div");
    document.body.appendChild(root);
    const consent = new MutableConsentSource("unknown");
    let parseCalls = 0;
    let starts = 0;
    const runtime = createVerificationRuntimeInternal(
      { consentSource: consent },
      {
        isHTMLElement: (value): value is HTMLElement => value === root,
        parseTag: (value, ownerDocument) => {
          parseCalls += 1;
          return parseIasTag(value, ownerDocument);
        },
        startProvider: () => {
          starts += 1;
          return { dispose() {}, settled: Promise.resolve() };
        },
      },
    );
    runtime.register({ element: root, renderKey: "ad", verificationTag: valid });
    expect(parseCalls).toBe(0);
    expect(starts).toBe(0);
    consent.set("denied");
    expect(parseCalls).toBe(0);
    consent.set("granted");
    await settle();
    expect(parseCalls).toBe(0);
    expect(starts).toBe(0);

    const consent2 = new MutableConsentSource("unknown");
    const runtime2 = createVerificationRuntimeInternal(
      { consentSource: consent2 },
      {
        isHTMLElement: (value): value is HTMLElement => value === root,
        parseTag: (value, ownerDocument) => {
          parseCalls += 1;
          return parseIasTag(value, ownerDocument);
        },
        startProvider: () => {
          starts += 1;
          return { dispose() {}, settled: Promise.resolve() };
        },
      },
    );
    runtime2.register({ element: root, renderKey: "ad-2", verificationTag: valid });
    consent2.set("granted");
    await settle();
    expect(parseCalls).toBe(1);
    expect(starts).toBe(1);
  });

  it("integrates with the framework-neutral runtime", async () => {
    const document = doc();
    const root = document.createElement("div");
    document.body.appendChild(root);
    const diagnostics: string[] = [];
    const runtime = createVerificationRuntimeInternal(
      { consentSource: granted, onDiagnostic: ({ code }) => diagnostics.push(code) },
      {
        isHTMLElement: (value): value is HTMLElement => value === root,
        parseTag: parseIasTag,
        startProvider: (input) => {
          if (!input.parsedTag) throw new Error("missing parsed tag");
          return startIasProvider({
            element: input.element,
            parsedTag: input.parsedTag,
          });
        },
      },
    );

    const handle = runtime.register({ element: root, renderKey: "ad-1", verificationTag: valid });
    expect(diagnostics).toEqual(["registered"]);
    const script = root.querySelector("script");
    const EventCtor = document.defaultView?.Event;
    if (script && EventCtor) script.dispatchEvent(new EventCtor("load"));
    await Promise.resolve();
    expect(diagnostics).toEqual(["registered", "active"]);
    expect(root.querySelector("script")).not.toBeNull();
    handle.dispose();
    expect(root.querySelector("script")).toBeNull();
  });

  it("disposes before a late load and ignores the callback", async () => {
    const document = doc();
    const root = document.createElement("div");
    const session = startIasProvider({
      element: root,
      parsedTag: parseIasTag(valid, document),
    });
    const script = root.querySelector("script");
    session.dispose();
    const EventCtor = document.defaultView?.Event;
    if (script && EventCtor) {
      script.dispatchEvent(new EventCtor("load"));
    }
    await expect(session.settled).resolves.toBeUndefined();
    expect(root.querySelector("script")).toBeNull();
  });
});
