# Topsort Verification

`@topsort/verification` runs supported third-party verification tags beside the exact
Topsort-served ad that they measure. It provides consent gating, safe tag validation,
per-render lifecycle management, bounded diagnostics, and an optional React callback-ref
integration.

The initial release supports IAS monitoring tags for web display banners. Support for
additional providers, tag formats, mobile-app inventory, and direct browser script loading
will be added separately.

## Installation

Using npm:

```bash
npm install @topsort/verification
```

Using yarn:

```bash
yarn add @topsort/verification
```

The package ships as an ES module for npm-based applications and bundlers. Use `import` rather
than CommonJS `require()`. The `default` export conditions resolve to the same ES module files
for compatible tooling; they do not provide a CommonJS build. The package does not yet provide
an IIFE build for direct `<script>` installation.

## Supported integration

The initial support boundary is intentionally narrow:

- web display banners rendered into the page DOM;
- Topsort auction winners carrying `asset[0].content.verificationTag`;
- IAS JavaScript monitoring tags using the confirmed `staticjs.adsafeprotected.com/fw.js`
  format;
- one registration for each rendered ad instance;
- framework-neutral JavaScript and an optional React callback-ref integration.

It does not currently support:

- IAS blocking wrappers or IAS-hosted creatives;
- arbitrary HTML, inline scripts, or unconfirmed IAS tag formats;
- providers other than IAS;
- native mobile-app measurement through OM SDK or OMID;
- direct `<script>` or IIFE installation;
- automatic banner discovery.

## Quick start

Create one runtime for the page or application and connect it to the marketplace's consent
system:

```ts
import {
  createVerificationRuntime,
  type ConsentSource,
  type ConsentState,
  type VerificationHandle,
} from "@topsort/verification";

let consentState: ConsentState = "unknown";
const consentListeners = new Set<(state: ConsentState) => void>();

const consentSource: ConsentSource = {
  current: () => consentState,
  subscribe(listener) {
    consentListeners.add(listener);
    return () => consentListeners.delete(listener);
  },
};

// Call this from the marketplace's consent-management integration.
function updateVerificationConsent(nextState: ConsentState) {
  consentState = nextState;
  for (const listener of consentListeners) listener(nextState);
}

const runtime = createVerificationRuntime({
  consentSource,
  onDiagnostic(event) {
    console.debug("Topsort verification", event);
  },
});
```

After the winning creative has been inserted into the DOM, register it with the runtime:

```ts
const winner = auctionResponse.results[0]?.winners[0];
const bannerRoot = document.querySelector<HTMLElement>("#rendered-banner");
let verificationHandle: VerificationHandle | undefined;

if (winner && bannerRoot) {
  verificationHandle = runtime.register({
    verificationTag: winner.asset?.[0]?.content?.verificationTag,
    renderKey: winner.resolvedBidId,
    element: bannerRoot,
    onDiagnostic(event) {
      // This callback is scoped to this rendered winner.
      verificationLogger.info({ placement: "rendered-banner", ...event });
    },
  });
}

// Later, when this particular rendered ad is removed or replaced:
verificationHandle?.dispose();
```

Keep the returned handle for the lifetime of that rendered ad. Dispose it when the creative is
actually replaced, unmounted, or removed.

When the page-level integration itself is torn down, dispose the runtime:

```ts
runtime.dispose();
```

## Consent

The marketplace owns consent collection and supplies a `ConsentSource`. The package does not
read cookies, infer consent, or integrate with a consent-management platform automatically.

```ts
interface ConsentSource {
  current(): "unknown" | "granted" | "denied";
  subscribe(
    listener: (state: "unknown" | "granted" | "denied") => void,
  ): () => void;
}
```

The current lifecycle is:

- `unknown`: the registration waits without parsing or loading the provider tag;
- `granted`: the IAS tag is validated and the provider resource is inserted;
- `denied`: the registration terminates without loading IAS;
- consent becoming `unknown` or `denied` after loading starts: the registration terminates and
  package-owned resources are removed on a best-effort basis. A later grant does not restart it.

An initially denied registration is terminal. If consent is granted later, register the
rendered creative again or reload the page. A provider failure is also terminal for that
registration and requires a new registration to retry. Removing package-owned resources cannot
undo provider requests, globals, storage, or other effects that have already occurred.

`granted` is an assertion supplied by the marketplace. It must mean that the marketplace has
satisfied every applicable region-, purpose-, and vendor-specific requirement for loading IAS.
The package does not make that policy decision.

## Registering a rendered ad

`runtime.register()` accepts:

| Field | Type | Description |
|---|---|---|
| `verificationTag` | `string \| null \| undefined` | The supported provider tag returned with the winning creative. Missing or blank means that verification is not enabled for this creative. |
| `renderKey` | `string` | A unique identity for this rendered winner. Use its `resolvedBidId`. |
| `element` | `HTMLElement` | The connected DOM element containing the creative being measured. |
| `onDiagnostic` | `(event) => void` | Optional diagnostics scoped to this registration. Use the callback closure for safe placement correlation. |

The element must already be connected to the document when consent permits provider startup.
An absent or blank tag safely becomes a silent no-op because most creatives will not necessarily
use verification. It still disposes any previous registration owned by the same element, so a
verified creative can be replaced by an unverified one safely. Invalid elements, missing render
keys, disposed runtimes, and malformed non-empty tags produce bounded diagnostics.

One runtime can manage many rendered ads. The same campaign-level IAS tag can be registered
for several elements; each distinct element and `resolvedBidId` represents an independent ad
instance.

Registering a different tag or render key for an element replaces the existing registration
for that element. Repeating the same element, tag, and render key returns the existing handle
instead of starting IAS twice.

Verification failure never removes, hides, or disables the creative.

## React

React support is provided through a separate entrypoint so that the framework-neutral bundle
does not depend on React:

```tsx
import { createVerificationRuntime } from "@topsort/verification";
import { useVerificationRef } from "@topsort/verification/react";

function SponsoredBanner({ runtime, winner }) {
  const verificationRef = useVerificationRef(runtime, {
    verificationTag: winner.asset?.[0]?.content?.verificationTag,
    renderKey: winner.resolvedBidId,
  });

  return (
    <div ref={verificationRef}>
      <img src={winner.asset[0].url} alt="Sponsored" />
    </div>
  );
}
```

React is an optional peer dependency. Importing the base `@topsort/verification` entrypoint
does not load React.

## Supported IAS tag

The confirmed IAS web-display integration accepts one external JavaScript tag of this form:

```html
<script
  type="application/javascript"
  src="https://staticjs.adsafeprotected.com/fw.js?advEntityId=3072912&pubEntityId=96261444"
></script>
```

The parser accepts normal HTML case-insensitivity but requires:

- exactly one external `<script>` element;
- HTTPS;
- hostname `staticjs.adsafeprotected.com`;
- path `/fw.js`;
- exactly one numeric `advEntityId`;
- exactly one numeric `pubEntityId`;
- `type="application/javascript"`;
- no inline JavaScript, extra elements, unexpected attributes, credentials, custom port,
  fragment, duplicate parameters, or unexpected query parameters.

The original markup is never inserted or evaluated. The package creates a new script element
containing only the validated `type` and canonical `src`, then inserts it into the exact
element supplied to `register()`.

Tags outside this confirmed format are rejected. Contact Topsort before using another IAS tag
format or provider.

## Diagnostics

Pass `onDiagnostic` when creating the runtime to observe bounded lifecycle events:

```ts
const runtime = createVerificationRuntime({
  consentSource,
  onDiagnostic({ code, provider, elapsedMs }) {
    verificationLogger.info({ code, provider, elapsedMs });
  },
});
```

Diagnostic records contain only a code, provider name, and elapsed time. They do not contain
the raw tag, its URL query, page content, or arbitrary provider errors.

`elapsedMs` is measured from the call to `register()`. It includes time spent waiting for consent
and must not be interpreted as IAS download latency. Use a registration-level `onDiagnostic`
callback when an event must be associated with a particular placement; the callback can close
over the marketplace's own non-sensitive placement identity. When global and registration-level
callbacks are both configured, both receive the event.

| Code | Meaning |
|---|---|
| `registered` | The runtime accepted ownership of the registration. |
| `active` | The provider script emitted a successful browser `load` event. |
| `disposed` | The registration was explicitly disposed. |
| `invalid_tag` | A non-empty tag was malformed or outside the supported grammar. |
| `consent_denied` | Consent was denied before provider startup. |
| `consent_withdrawn` | Consent ceased to be granted after provider startup began. |
| `consent_source_failed` | The marketplace consent adapter threw or otherwise failed. |
| `invalid_element` | The supplied value was not a browser `HTMLElement`. |
| `invalid_render_key` | The supplied render key was absent or blank. |
| `element_not_ready` | The supplied element was not connected when startup was attempted. |
| `provider_load_failed` | The browser reported that the provider resource failed to load. |
| `provider_start_failed` | Provider startup failed for another contained reason. |
| `replaced_registration` | A different registration replaced the one owned by the element. |
| `runtime_disposed` | Registration was attempted after the runtime was disposed. |

`active` is deliberately narrow: it means the IAS bootstrap resource loaded successfully in
the browser. It does not prove that IAS measured an impression, classified it as viewable, or
accepted it into reporting. Confirm measurement through IAS reporting or with IAS support.

## Content Security Policy

The page must allow the IAS bootstrap script in its Content Security Policy. For the confirmed
tag, the minimum script source is:

```text
script-src https://staticjs.adsafeprotected.com
```

IAS may make subsequent requests that require additional `connect-src`, `img-src`, or
`frame-src` origins. Obtain the production requirements from IAS and validate them against the
marketplace's page before rollout. A successful script `load` event alone does not establish
that every downstream IAS request was permitted.

## Browser support

The runtime is tested in current Chromium, Firefox, and WebKit through Playwright. It requires
standard browser DOM APIs, including `HTMLElement`, `DOMParser`, and dynamic script elements.
The package entrypoints are safe to import in an SSR environment, but registration requires a
browser element.

## Troubleshooting

### No IAS request is made

Check that:

- consent is `granted`;
- the element is connected to the document;
- the tag exactly matches the supported IAS grammar;
- `resolvedBidId` was supplied as a non-empty render key;
- the page's CSP and browser extensions allow the IAS resource.

Use `onDiagnostic` to distinguish consent, validation, element, and network failures.

### The diagnostic says `active`, but IAS has no report yet

`active` describes browser resource loading, not IAS measurement acceptance. Confirm that
downstream IAS network requests are not blocked, then allow for the reporting delay agreed with
IAS.

### Ad blocking is enabled

Ad blockers can prevent IAS resources from loading. This is reported as a provider load failure
and is separate from consent.

## Development

This package lives in the
[`Topsort/topsort.js`](https://github.com/Topsort/topsort.js/tree/main/packages/verification)
repository.

```bash
bun install
bun run --cwd packages/verification test
bun run --cwd packages/verification typecheck
bun run --cwd packages/verification build
bun run --cwd packages/verification test:browser
bun run --cwd packages/verification test:package
```

## License

MIT
