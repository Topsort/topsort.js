# @topsort/verification

Private, browser-side third-party verification runtime for Topsort-served banners.

This package remains private and is not approved for production use or publication.

## Installation and imports

The private workspace can be consumed by approved repository fixtures only:

```ts
import { createVerificationRuntime } from "@topsort/verification";
import { useVerificationRef } from "@topsort/verification/react";
```

The base entrypoint is framework-neutral and SSR-safe. React is loaded only by the
`/react` subpath and remains an external peer dependency.

## Confirmed IAS POC status

The IAS adapter is deliberately narrow for the confirmed web-display POC. It
currently accepts only this IAS JavaScript measurement script shape:

```html
<script
  type="application/javascript"
  src="https://staticjs.adsafeprotected.com/fw.js?advEntityId=3072912&pubEntityId=96261444"
></script>
```

The parser requires a single external HTTPS script with
`type="application/javascript"`, exact host `staticjs.adsafeprotected.com`, exact
path `/fw.js`, and exactly one numeric `advEntityId` plus one numeric
`pubEntityId`. It rejects credentials, custom ports, fragments, duplicate or
unexpected parameters, inline JavaScript, unexpected elements, and unexpected
attributes. HTML tag and attribute names are handled case-insensitively.

The adapter reconstructs a fresh script node with only the validated `type` and
`src`. It never executes stored markup, uses `innerHTML`, appends the original
parsed element, appends to `document.head`, or invents an `async` attribute.

The script is inserted into the exact `HTMLElement` supplied to `register`, once
per registration. Disposal removes Topsort-owned nodes and aborts pending work;
it cannot undo provider code, requests, globals, or storage that already ran.
The adapter currently uses an internal five-second resource timeout as a
development safeguard; this is not an IAS requirement and is not configurable
through the public API.

`active` means only that the provider resource emitted a successful
`load` event. It does not mean IAS measured an impression, found the element
viewable, or accepted reporting.

Consent is checked before parsing or loading the tag: `unknown` waits, `granted`
starts, and `denied` terminates. Withdrawal after loading begins invalidates the
registration and performs best-effort package-owned cleanup.

The consuming page must eventually allow every confirmed IAS origin in the
appropriate CSP directives. This POC only permits the confirmed bootstrap script
origin; complete production `script-src`, `connect-src`, `img-src`, and
`frame-src` requirements remain out of scope until IAS-side validation.

Diagnostics contain only a bounded code, the provider name, and elapsed time.
They never include the raw tag, its URL query, page content, or arbitrary
provider errors.

## Usage

```ts
import { createVerificationRuntime } from "@topsort/verification";

const runtime = createVerificationRuntime({ consentSource });
const handle = runtime.register({
  verificationTag: banner.content.verificationTag,
  renderKey: banner.adId,
  element: bannerRoot,
});
```

React consumers can use the callback-ref bridge without adding React to the base
entrypoint:

```ts
import { useVerificationRef } from "@topsort/verification/react";

const ref = useVerificationRef(runtime, {
  verificationTag: banner.content.verificationTag,
  renderKey: banner.adId,
});
```

Registration is a safe no-op when `element` is not a valid `HTMLElement`, when
`verificationTag` is absent or empty, or when `renderKey` is absent or empty.
No provider resource is loaded in those cases.

The package remains private, pre-production, IAS-specific for this MVP, and not
certified as a production IAS integration.
