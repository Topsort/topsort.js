# Topsort SDK

This repository holds the official Topsort javascript client library. This project is built with [TypeScript][typescript] and uses [Bun][bun] for package management and testing.

[typescript]: https://www.typescriptlang.org
[bun]: https://bun.sh/

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Creating an Auction](#auctions)
  - [Reporting an Event](#events)
    - [Retryable Errors](#retryable-errors)
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

To create an auction, use the `createAuction` function. Example:

```js
import { type TopsortAuction, createAuction } from "@topsort/sdk";

const auctionDetails: TopsortAuction = {
  auctions: [
    {
      type: "listings",
      slots: 3,
      category: { id: "cat123" },
      geoTargeting: { location: "US" },
    },
    {
      type: "banners",
      slots: 1,
      device: "desktop",
      slotId: "slot123",
      category: { ids: ["cat1", "cat2"] },
      geoTargeting: { location: "UK" },
    },
  ],
};

const config = {
  // generate your api key in the auction manager - it should look some thing like this
  // note: this is an invalid key and won't work, you need to replace it with your own
  apiKey: "TSE_4S6o1g1CB5tyRENfhDMAn6viR7A5cy3j1JAR",
};

createAuction(config, auctionDetails)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Parameters

`config`: An object containing configuration details including the API key. Please refer to [Auction Manager](https://app.topsort.com/new/en-US/marketplace/account-settings/api-integration)

`auctionDetails`: An object containing the details of the auction to be created, please refer to [Topsort's Auction API doc](https://docs.topsort.com/reference/createauctions) for body specification.

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
400:
```json
{
  "status": 400,
  "statusText": "No Content",
  "body": {
    "errCode": "bad_request",
    "docUrl": "https://docs.topsort.com/reference/errors",
    "message": "The request could not be parsed.",
  },
}
```

### Events

To report an event, use the reportEvent function. Here is an example:

```js
import { type TopsortEvent, reportEvent } from "@topsort/sdk";

const event: TopsortEvent = {
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
};

const config = {
  // generate your api key in the auction manager - it should look some thing like this
  apiKey: "TSE_4S6o1g1CB5tyRENfhDMAn6viR7A5cy3j1JAR",
};

reportEvent(config, event)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Parameters

`config`: An object containing configuration details including the API key. Please refer to [Auction Manager](https://app.topsort.com/new/en-US/marketplace/account-settings/api-integration)

`event`: An object containing the details of the event to be reported, please refer to [Topsort's Event API doc](https://docs.topsort.com/reference/reportevents) for body specification.

#### Sample response

200:
```json
{
  "ok": true,
  "retry": false
}
```
400:
```json
{
  "status": 400,
  "statusText": "No Content",
  "body": {
    "errCode": "bad_request",
    "docUrl": "https://docs.topsort.com/reference/errors",
    "message": "The request could not be parsed."
  }
}
```
429:
```json
{
  "ok": false,
  "retry": true
}
```

#### Retryable Errors

The `reportEvent` function returns `"retry": true` if the response status code is `429` or any `5xx`. This enables you to identify when it’s appropriate to retry the function call.

## Contributing

We aim to cover the entire Topsort API, and contributions are always welcome. The calling pattern is well established, making the addition of new methods relatively straightforward. For more detailed guidelines on how to contribute, please refer to our [CONTRIBUTING.md](CONTRIBUTING.md).

Your help in enhancing the project is highly appreciated. Whether it’s reporting a bug, suggesting a new feature, or submitting a pull request, every bit of input helps us improve. Thank you for your support and happy coding!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
