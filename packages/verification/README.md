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
