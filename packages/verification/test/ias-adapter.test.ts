import { describe, expect, it } from "bun:test";
import { parseHTML } from "linkedom";
import {
  IAS_HOSTNAME,
  IAS_PATHNAME,
  IAS_SCRIPT_TYPE,
  type ParsedIasTag,
  parseIasTag,
  startIasProvider,
} from "../src/providers/ias";

function doc() {
  return parseHTML("<!doctype html><html><body></body></html>").document;
}

const valid = `<SCRIPT TYPE="application/javascript" SRC="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=3072912&pubEntityId=96261444"></SCRIPT>`;

describe("confirmed IAS adapter", () => {
  it("parses and canonicalizes the IAS-issued JavaScript fragment", () => {
    const parsed = parseIasTag(`  ${valid}  `, doc());
    expect(parsed).toEqual({
      src: `https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=3072912&pubEntityId=96261444`,
      type: IAS_SCRIPT_TYPE,
      identity: `ias-script:https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=3072912&pubEntityId=96261444`,
    });
  });

  it("accepts normal HTML case-insensitivity", () => {
    const uppercaseMarkup = `<SCRIPT TYPE="APPLICATION/JAVASCRIPT" SRC="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=3072912&pubEntityId=96261444"></SCRIPT>`;
    expect(parseIasTag(uppercaseMarkup, doc())).toMatchObject({
      src: `https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=3072912&pubEntityId=96261444`,
      type: IAS_SCRIPT_TYPE,
    });
  });

  it.each([
    "<script>evil()</script>",
    `<script async src="https://pixel.adsafeprotected.com/verification.js?placement=abc"></script>`,
    `<ins><script src="https://www.googletagservices.com/dcm/dcmads.js"></script></ins>${valid}`,
    `<script type="application/javascript" src="http://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://not-${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://user:pass@${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}:444${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2#fragment"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}/other.js?advEntityId=1&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=abc&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=abc"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&advEntityId=2&pubEntityId=3"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2&unexpected=3"></script>`,
    `<script type="text/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script>`,
    `<script src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2" async></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2" onload="evil()"></script>`,
    `<script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=1&pubEntityId=2"></script><script type="application/javascript" src="https://${IAS_HOSTNAME}${IAS_PATHNAME}?advEntityId=3&pubEntityId=4"></script>`,
    `<img src="https://${IAS_HOSTNAME}${IAS_PATHNAME}">`,
    `text ${valid}`,
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
    expect(script?.getAttribute("type")).toBe(IAS_SCRIPT_TYPE);
    expect(script?.hasAttribute("async")).toBe(false);
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
