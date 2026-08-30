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

## MVP 2 status

The IAS adapter is deliberately provisional and unconfirmed. It currently accepts
only one external script shape:

```html
<script async src="https://pixel.adsafeprotected.com/verification.js?..."></script>
```

The hostname, URL shape, and lifecycle behaviour are assumptions for development,
not a compatibility or accreditation claim. The parser requires a single external
HTTPS script, the exact provisional hostname, no credentials, and only `src` and
`async` attributes. It reconstructs a fresh script node and never executes the
stored markup, uses `innerHTML`, or appends to `document.head`.

The script is inserted into the exact `HTMLElement` supplied to `register`, once
per registration. Disposal removes Topsort-owned nodes and aborts pending work;
it cannot undo provider code, requests, globals, or storage that already ran.
The adapter currently uses an internal five-second resource timeout as a
development safeguard; this is not an IAS requirement and is not configurable
through the public API.

`active` means only that the assumed provider resource emitted a successful
`load` event. It does not mean IAS measured an impression, found the element
viewable, or accepted reporting.

Consent is checked before parsing or loading the tag: `unknown` waits, `granted`
starts, and `denied` terminates. Withdrawal after loading begins invalidates the
registration and performs best-effort package-owned cleanup.

The consuming page must eventually allow every confirmed IAS origin in the
appropriate CSP directives. The provisional fixture uses the assumed script
origin only; real `script-src`, `connect-src`, `img-src`, and `frame-src` origins
remain blocked on a representative tag.

Diagnostics contain only a bounded code, the provisional provider name, and
elapsed time. They never include the raw tag, its URL query, page content, or
arbitrary provider errors.

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

The package remains private until a representative real IAS tag, its network/CSP
requirements, exact element-binding model, and provider cleanup semantics are
confirmed.
