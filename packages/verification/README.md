# @topsort/verification

Private, pre-production browser runtime contract for third-party verification of
Topsort-served banners. The package is not approved for production use or publication.

The base entrypoint is framework-neutral. Its public contract covers consent input,
exact-element registration, bounded diagnostics, disposable registration handles, and
runtime disposal. Provider execution and framework integrations are added in later layers
of the verification stack.

## Confirmed IAS tag boundary

The IAS adapter accepts one external HTTPS script with
`type="application/javascript"`, exact host `staticjs.adsafeprotected.com`, exact path
`/fw.js`, and exactly one numeric `advEntityId` and `pubEntityId`. It rejects inline code,
credentials, custom ports, fragments, duplicate or unexpected parameters, elements, and
attributes. It reconstructs a fresh script node and inserts it into the supplied banner
element; stored markup is never passed to `innerHTML`.

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

Consent is checked before parsing or loading the tag: `unknown` waits, `granted` starts,
and `denied` terminates. Registration is a safe no-op for an invalid element, an absent or
empty `verificationTag`, or an absent or empty `renderKey`.

Registration identity is the element, render key, and normalized tag. Re-registering the
same tuple is deduplicated; replacing a tuple disposes its package-owned work. Handle and
runtime disposal are idempotent. Cleanup cannot undo provider code, requests, globals, or
storage that already ran.

Diagnostics contain only a bounded code, provider name, and elapsed time. `active` means
only that the provider resource emitted a successful `load` event; it does not mean IAS
measured an impression, found the element viewable, or accepted reporting.
