# Topsort SDK

This repository holds the official Topsort javascript client library. This project is built with [TypeScript][typescript] and uses [Bun][bun] for package management and testing.

[typescript]: https://www.typescriptlang.org
[bun]: https://bun.sh/

## Table of Contents

- [Topsort SDK](#topsort-sdk)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Auctions](#auctions)
      - [Parameters](#parameters)
        - [Config Parameters](#config-parameters)
      - [Sample response](#sample-response)
    - [Events](#events)
      - [Parameters](#parameters-1)
        - [Config Parameters](#config-parameters-1)
      - [Sample response](#sample-response-1)
    - [Error handling](#error-handling)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

Using npm:
```sh
npm install @topsort/sdk --save
```

Using yarn:
```sh
yarn add @topsort/sdk --save
```

## Usage

### Auctions

To create an auction, first initialize a Topsort Client, then call the `createAuction` function:

```ts
import { TopsortClient } from "@topsort/sdk";
import type { Auction } from "@topsort/sdk";

const auctionDetails: Auction = {
  auctions: [
    {
      type: "listings",
      slots: 3,
      category: { id: "cat123" },
      geoTargeting: { location: "US" },
      opaqueUserId: "71303ce0-de89-496d-8270-6434589615e8",
      page: { pageId: "category-cat123", type: "category", value: "cat123" },
      filter: { operator: "and", attributes: ["brand:nike", "color:black"] },
    },
    {
      type: "banners",
      slots: 1,
      device: "desktop",
      slotId: "slot123",
      category: { ids: ["cat1", "cat2"] },
      geoTargeting: { location: "UK" },
      opaqueUserId: "71303ce0-de89-496d-8270-6434589615e8",
      page: { pageId: "/cart", type: "cart", value: ["p_1", "p_2"] },
    },
  ],
};

const config = {
  // generate your api key in the auction manager - it should look some thing like this
  // note: this is an invalid key and won't work, you need to replace it with your own
  apiKey: "TSE_4S6o1g1CB5tyRENfhDMAn6viR7A5cy3j1JAR"
};

const topsortClient = new TopsortClient(config)

topsortClient.createAuction(auctionDetails)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Parameters

`config`: An object containing configuration details including the API key. Please refer to [Auction Manager](https://app.topsort.com/new/en-US/marketplace/account-settings/api-integration)

##### Config Parameters
- `apiKey`: Your Topsort API Key
- `host`: Optional API host. Defaults to `https://api.topsort.com`.
- `userAgent`: Optional string appended to the `X-UA` header that the SDK sends with every request. Example: `my-app/1.2.0`
- `timeout`: Optional timeout in milliseconds. There is no default timeout. If the timeout is reached, the call rejects with an `AppError`, see [Error handling](#error-handling).
- `fetchOptions`: Optional fetch options to pass to the fetch call. Defaults to `{ keepalive: true }`.

`auctionDetails`: An object containing the details of the auction to be created, please refer to [Topsort's Auction API doc](https://docs.topsort.com/en/api-reference/auctions/create-auctions) for body specification.

Send the same `opaqueUserId` on every auction and event for a shopper. Purchase attribution depends on it being consistent and long lived. Server-side integrations must forward the id generated in the browser. Each auction in the response has its own `error` flag, so check `results[i].error` even when the call succeeds.

A `listings` auction takes at least one and at most two of `products`, `category` and `searchQuery`. For `banners`, leave `category` and `searchQuery` empty for a landing page banner, set `category` for a category banner, and set `searchQuery` for a keyword banner. Category ids must match your catalog ids exactly. `category.ids` requires a product to belong to all of them, and `category.disjunctions` requires at least one match in each group. `filter` (available since 0.6.0, listings only) takes an `operator` (`and` or `or`) and up to 5 `key:value` attributes.

##### Overriding fetch options

By default, we pass `{ keepalive: true }` to fetch while making requests to our APIs. If you want to pass other options,
you can do so with the `fetchOptions` object. It is merged over the defaults, so to turn keepalive off pass `{ keepalive: false }`.

#### Sample response

200:
```json
{
  "results": [
    {
      "winners": [
        {
          "rank": 1,
          "type": "product",
          "id": "p_Mfk11",
          "campaignId": "82588593-85c5-47c0-b125-07e315b7f2b3",
          "resolvedBidId": "WyJiX01mazExIiwiMTJhNTU4MjgtOGVhZC00Mjk5LTMyNjYtY2ViYjAwMmEwZmE4IiwibGlzdGluZ3MiLCJkZWZhdWx0IiwiIl0=="
        }
      ],
      "error": false
    },
    {
      "winners": [],
      "error": false
    }
  ]
}
```

A rejected call throws an `AppError`, see [Error handling](#error-handling).

### Events

To report an event, first initialize a Topsort Client, then call the `reportEvent` function:

```ts
import { TopsortClient } from "@topsort/sdk";
import type { Event } from "@topsort/sdk";

const event: Event = {
  renders: [
    {
      resolvedBidId:
        "ChAGaP5D2ex-UKEEBCOHwvDjEhABkF4FDAx0S5mMD2cOG0w9GhABkEnL2CB6qKIoqeItVgA_",
      id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46148",
      occurredAt: "2024-07-11T13:55:08Z",
      opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
      placement: {
        path: "/categories/sports",
      },
    },
  ],
  impressions: [
    {
      resolvedBidId:
        "ChAGaP5D2ex-UKEEBCOHwvDjEhABkF4FDAx0S5mMD2cOG0w9GhABkEnL2CB6qKIoqeItVgA_InsKd2h0dHBzOi8vd3d3LndlYmEuYmUvZnIvcHJvbW8uaHRtbD91dG1fc291cmNlPW15c2hvcGkmdXRtX21lZGl1bT1iYW5uZXJfMTI4MHg0MDAmdXRtX2NvbnRlbnQ9ZGlzcGxheSZ1dG1fY2FtcGFpZ249c29sZGVuEAU",
      id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46149",
      occurredAt: "2024-07-11T13:55:09Z",
      opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
      placement: {
        path: "/categories/sports",
      },
    },
  ],
  clicks: [
    {
      resolvedBidId:
        "ChAGaP5D2ex-UKEEBCOHwvDjEhABkF4FDAx0S5mMD2cOG0w9GhABkEnL2CB6qKIoqeItVgA_",
      id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46150",
      occurredAt: "2024-07-11T13:56:09Z",
      opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
      entity: {
        id: "p_Mfk11",
        type: "product",
      },
      placement: {
        path: "/categories/sports",
      },
    },
  ],
  purchases: [
    {
      id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46151",
      occurredAt: "2024-07-11T13:57:09Z",
      opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
      items: [
        {
          productId: "p_Mfk11",
          quantity: 1,
          unitPrice: 49.99,
          vendorId: "v_8fj2D",
        },
      ],
    },
  ],
  pageviews: [
    {
      id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46152",
      occurredAt: "2024-07-11T13:54:09Z",
      opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e8",
      page: {
        pageId: "category-sports",
        type: "category",
        value: "/categories/sports",
      },
      deviceType: "mobile",
      channel: "onsite",
    },
  ],
};

const config = {
  // generate your api key in the auction manager - it should look some thing like this
  apiKey: "TSE_4S6o1g1CB5tyRENfhDMAn6viR7A5cy3j1JAR"
};

const topsortClient = new TopsortClient(config)

topsortClient.reportEvent(event)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Parameters

`config`: An object containing configuration details including the API key. Please refer to [Auction Manager](https://app.topsort.com/new/en-US/marketplace/account-settings/api-integration)

##### Config Parameters
- `apiKey`: Your Topsort API Key
- `host`: Optional API host. Defaults to `https://api.topsort.com`.
- `userAgent`: Optional string appended to the `X-UA` header that the SDK sends with every request. Example: `my-app/1.2.0`
- `timeout`: Optional timeout in milliseconds. There is no default timeout. If the timeout is reached, the call rejects with an `AppError`, see [Error handling](#error-handling).
- `fetchOptions`: Optional fetch options to pass to the fetch call. Defaults to `{ keepalive: true }`. To turn keepalive off pass `{ keepalive: false }`. When keepalive is enabled, requests will continue even if the page is being unloaded, which is useful for analytics and event tracking.

`event`: An object containing the details of the event to be reported, please refer to [Topsort's Event API doc](https://docs.topsort.com/en/api-reference/events/report-events) for body specification. Each event array accepts at most 50 events per request.

Events can be reported as `renders`, `impressions`, `clicks`, `purchases` and `pageviews`. A **render** means an ad was inserted into the page, whether or not it ever became visible; an **impression** means it became visible to the consumer. Renders are for sponsored ads only, so `resolvedBidId` is required and there is no `entity` or `additionalAttribution` field. Renders are never chargeable.

Report a render when you insert the ad into the page and an impression when it becomes visible. Each event needs a unique `id`. It makes reporting idempotent, so when you retry an event, resend it with the same `id`. Use the same `opaqueUserId` that you send on auctions. Purchase `unitPrice` is a decimal in the marketplace's major currency unit. Set `vendorId` on a purchase item when a product is sold by several vendors or you want halo attribution.

#### Sample response

200:
```json
{
  "ok": true,
  "retry": false
}
```
429 or 5xx with a JSON body:
```json
{
  "ok": false,
  "retry": true
}
```

### Error handling

Failed calls reject with an `AppError` (exported from the package) that has the fields `status`, `statusText`, `body` and `retry`. `AppError` is a plain class, not a subclass of `Error`, so check it with `instanceof AppError`.

```ts
import { AppError } from "@topsort/sdk";

try {
  await topsortClient.createAuction(auctionDetails);
} catch (error) {
  if (error instanceof AppError) {
    console.error(error.status, error.body, error.retry);
  }
}
```

- `reportEvent` resolves with `{ ok: false, retry: true }` when the response status is `429` or any `5xx` and the response body is JSON. Retry the call with the same event object, so each event keeps its `id`.
- Any other failure rejects with an `AppError` and `retry` is `false`. Examples: a `400` (`body` holds the API error, such as `{ "errCode": "bad_request", "message": "..." }`), a missing `apiKey` (`401`), a network failure, a timeout, or a `5xx` response whose body is not JSON.
- Network failures and timeouts reject with an `AppError` with status `500`, and `body` holds the error message.
- `createAuction` never resolves with `retry`. For a `429` or `5xx` response with a JSON body it rejects with an `AppError` whose `retry` is `true`. If the body is not JSON, it rejects with `status` 500 and `retry` `false`, and the original status is lost.

The type definitions currently require `page.value`, `items[].quantity` and the winner `campaignId`, although the API treats them as optional.

## Contributing

We aim to cover the entire Topsort API, and contributions are always welcome. The calling pattern is well established, making the addition of new methods relatively straightforward. For more detailed guidelines on how to contribute, please refer to our [CONTRIBUTING.md](CONTRIBUTING.md).

Your help in enhancing the project is highly appreciated. Whether it’s reporting a bug, suggesting a new feature, or submitting a pull request, every bit of input helps us improve. Thank you for your support and happy coding!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
