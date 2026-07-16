# @topsort/react-native-sdk

Official [Topsort](https://topsort.com) SDK for React Native. Same `createAuction` and `reportEvent` API as [`@topsort/sdk`](../web/README.md), with a React Native fetch transport (no `keepalive`) and an **opt-in durable offline event queue**.

## Installation

Install the SDK and its required peer dependencies:

```sh
npm install @topsort/react-native-sdk react-native-url-polyfill
# or
yarn add @topsort/react-native-sdk react-native-url-polyfill
```

| Package | Version | Required |
| --- | --- | --- |
| `react-native` | `>=0.70.0` | yes |
| `react-native-url-polyfill` | `>=2.0.0` | yes |
| `@react-native-async-storage/async-storage` | `>=1.17.0` | only if you enable `offlineQueue` without a custom `storage` |
| `@react-native-community/netinfo` | `>=9.0.0` | recommended with `offlineQueue` (reconnect flush) |
| `react-native-mmkv` | `>=2.0.0` | optional encrypted storage adapter |

### Why `react-native-url-polyfill`?

The shared core sanitizes every request URL with `new URL()` before calling `fetch`. React Native's built-in `URL` is incomplete and can misbehave on trailing-slash normalization. The SDK imports the polyfill automatically when you load the transport, but **you must install the peer dependency** so Metro can resolve it.

## Usage

```ts
import { TopsortClient } from "@topsort/react-native-sdk";

const client = new TopsortClient({
  apiKey: "TSE_your_api_key",
});

const auction = await client.createAuction({
  auctions: [{ type: "listings", slots: 3, products: { ids: ["p_1"] } }],
});

// Without offlineQueue: 429 / 5xx return { ok: false, retry: true } (same as web).
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

## Offline event queue

This is the React Native analog of the web SDK's `keepalive` default: events that fail with a **retryable** core signal (`{ ok: false, retry: true }` for HTTP 429/5xx) or a **network/transport** failure are persisted locally and flushed when connectivity returns or the app transitions through `AppState` `active` / `background`.

Design follows [topsort.kt](https://github.com/Topsort/topsort.kt): persist under a record id → deferred connectivity-gated send → delete on success or permanent 4xx; retry with backoff on transient failure.

### Enable (opt-in — non-breaking)

```ts
import {
  TopsortClient,
  createAsyncStorageAdapter,
  createMMKVStorageAdapter,
} from "@topsort/react-native-sdk";

// Default AsyncStorage adapter (plaintext)
const client = new TopsortClient({
  apiKey: "TSE_your_api_key",
  offlineQueue: true,
});

// Preferred encrypted posture (MMKV encryption key) — closest to Android EncryptedSharedPreferences
const encrypted = new TopsortClient({
  apiKey: "TSE_your_api_key",
  offlineQueue: {
    storage: createMMKVStorageAdapter({ encryptionKey: "your-32-byte-secret-key!!!!" }),
    maxSize: 1000,
    dropPolicy: "oldest", // or "newest"
    maxAttempts: 10,
  },
});

await client.whenReady();
await client.flush(); // optional manual flush
client.dispose(); // unsubscribe AppState / NetInfo
```

With the queue enabled:

| Core outcome | RN client behavior |
| --- | --- |
| `{ ok: true }` | unchanged |
| `{ ok: false, retry: true }` | enqueued; resolves `{ ok: true, retry: false }` (SDK owns retry) |
| Thrown 4xx (`AppError`, e.g. 401) | not enqueued; still throws |
| Network / transport failure | enqueued; resolves `{ ok: true, retry: false }` |

When `offlineQueue` is omitted, behavior matches `@topsort/sdk` / Phase 2 exactly.

### Storage adapters

| Helper | Notes |
| --- | --- |
| `createAsyncStorageAdapter()` | Default when `offlineQueue: true` |
| `createMMKVStorageAdapter({ encryptionKey })` | Encrypted cache option |
| `createMemoryStorageAdapter()` | Tests / ephemeral |

You can also pass any object implementing `EventStorageAdapter` (`getItem` / `setItem` / `removeItem` / `getAllKeys`).

## Versioning

Each package has its own `version` in `packages/web/package.json` and `packages/react-native/package.json`. Versions are independent — bump only the package(s) you are releasing. On a GitHub release, the publish workflow publishes each package only when that version is not already on npm.

## License

MIT — see [LICENSE](LICENSE).
