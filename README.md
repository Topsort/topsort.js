# Topsort.js

This repository holds the official Topsort.js client library. This project is built with [TypeScript][typescript] and uses [Bun][bun] for package management and testing.

[typescript]: https://www.typescriptlang.org
[bun]: https://bun.sh/

## Table of Contents

- [Installation](#installation)
- [Running Locally](#running-locally)
- [Usage](#usage)
  - [Creating an Auction](#auctions)
  - [Reporting an Event](#events)
- [Development](#development)
  - [Building the SDK](#building-the-sdk)
  - [Running Integration Tests](#running-integration-tests)
- [Configuration](#configuration)

## Installation

To install Topsort.js, you need to have Bun installed on your machine. Follow the instructions on the [Bun website](https://bun.sh/) to install it.

Clone the repository and install the dependencies:

```sh
git clone git@github.com:Topsort/topsort.js.git
cd topsort.js
bun install
```

## Running Locally

In order to run a local application and test it against the local Topsort.js you need to do the following (after having the SDK all set up on local machine):

On Topsort.js:
```bash
bun run build
bun link
```

This will register a local `topsort.js` to be used on the secondary project.

On the secondary project, if using bun, run:
```bash
bun link topsort.js
```
Or add it in dependencies in the package.json file:
```sh
"topsort.js": "link:topsort.js"
```

## Usage

### Auctions

To create an auction, use the createAuction function. Here is an example:

```js
import { createAuction } from 'topsort.js';

const auctionDetails = {
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
  apiKey: "your-api-key",
};

createAuction(config, auctionDetails)
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

Parameters:

`config`: An object containing configuration details including the API key.

`auctionDetails`: An object containing the details of the auction to be created, please refer to [Topsort's Auction API doc](https://docs.topsort.com/reference/createauctions).

### Events

To report an event, use the reportEvent function. Here is an example:

```js
import { reportEvent } from 'topsort.js';

const event = {
    impressions: [
      {
        resolvedBidId:
          "ChAGaP5D2ex-UKEEBCOHwvDjEhABkF4FDAx0S5mMD2cO",
        id: "1720706109.713344-53B92988-7A49-4679-B18E-465943B46150",
        occurredAt: "2024-07-11T13:55:09Z",
        opaqueUserId: "38e0a5ff-9f8a-4e80-8969-e5e3f01348e9",
      },
    ],
  };
  
const config = {
  apiKey: "your-api-key",
};

reportEvent(config, event)
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

Parameters:

`config`: An object containing configuration details including the API key.

`event`: An object containing the details of the event to be reported, please refer to [Topsort's Event API doc](https://docs.topsort.com/reference/reportevents).

## Development

### Building the SDK

To build the SDK, run the following command:

```sh
bun run build
```

This command cleans the `dist` directory and compiles the Typescript files into Javascript back to it

### Running Integration Tests

To run the integration tests, use the following command:

```sh
bun run test
```

## Configuration

The SDK uses following configuration files:

`tsconfig.json`: TypeScript configuration.

`tsup.config.ts`: Configuration for the TSUP bundler.
