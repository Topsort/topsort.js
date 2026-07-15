# @topsort/react-native-sdk

Official [Topsort](https://topsort.com) SDK for React Native. Same `createAuction` and `reportEvent` API as [`@topsort/sdk`](../web/README.md), with a React Native fetch transport (no `keepalive`, RN-appropriate defaults).

## Installation

Install the SDK and its peer dependencies:

```sh
npm install @topsort/react-native-sdk react-native-url-polyfill
# or
yarn add @topsort/react-native-sdk react-native-url-polyfill
```

Peer requirements:

| Package | Version |
| --- | --- |
| `react-native` | `>=0.70.0` |
| `react-native-url-polyfill` | `>=2.0.0` |

### Why `react-native-url-polyfill`?

The shared core sanitizes every request URL with `new URL()` before calling `fetch`. React Native's built-in `URL` is incomplete and can misbehave on trailing-slash normalization. The SDK imports the polyfill automatically when you load the transport, but **you must install the peer dependency** so Metro can resolve it.

## Usage

```ts
import { TopsortClient } from "@topsort/react-native-sdk";

const client = new TopsortClient({
  apiKey: "TSE_your_api_key",
});

// Auctions
const auction = await client.createAuction({
  auctions: [{ type: "listings", slots: 3, products: { ids: ["p_1"] } }],
});

// Events (429 / 5xx return { ok: false, retry: true } instead of throwing)
const result = await client.reportEvent({
  impressions: [
    {
      id: "imp-1",
      occurredAt: new Date().toISOString(),
      opaqueUserId: "user-1",
      resolvedBidId: "bid-1",
    },
  ],
});
```

See the [web SDK README](../web/README.md) for full auction and event payload shapes.

## Versioning

Each package has its own `version` in `packages/web/package.json` and `packages/react-native/package.json`. Versions are independent — bump only the package(s) you are releasing. On a GitHub release, the publish workflow publishes each package only when that version is not already on npm, so a web-only bump (e.g. `@topsort/sdk@0.4.2`) does not fail when `@topsort/react-native-sdk` is still at `0.4.1`.

## License

MIT — see [LICENSE](LICENSE).
