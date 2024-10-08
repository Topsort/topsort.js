# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
We follow the format used by [Open Telemetry](https://github.com/open-telemetry/opentelemetry-python/blob/main/CHANGELOG.md).

## Version 0.3.2 (2024-09-19)

- Simplifies tsup bundling ([#57](https://github.com/Topsort/topsort.js/pull/57))
- Adds custom error type to remove `any` ([#58](https://github.com/Topsort/topsort.js/pull/58))
- Improves the events types usage by exporting interfaces from `events.d.ts` ([#72](https://github.com/Topsort/topsort.js/pull/72/commits/3819cf7effee078833096139c6a2145829d610bf))
- Reverts changes from ([#37](https://github.com/Topsort/topsort.js/pull/37)) ([#72](https://github.com/Topsort/topsort.js/pull/72/commits/1c14393c61413dc5d7298b83942a185a4ac6a884))

## Version 0.3.1 (2024-08-15)

- Add validation to the response handler to prevent parsing of a No Content body ([#44](https://github.com/Topsort/topsort.js/pull/49))

## Version 0.3.0 (2024-08-13)

- Introduce a new way to initialize a client ([#43](https://github.com/Topsort/topsort.js/pull/43))

As part of the new implementation, a Topsort Client that embeds all functions is now initialized by receiving a config. Also, some types have been simplified:
- _TopsortAuction_ > **Auction**
- _TopsortEvents_ > **Event**

Migration steps:

#### Auctions - Before
```js
import { TopsortAuction, Config, reportAuction } from "@topsort/sdk";

const auction: TopsortAuction = {
    //...
};

const config: Config = {
  apiKey: "API_KEY",
};

createAuction(config, auction)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Auctions - After
```js
import { Auction, Config, TopsortClient } from "@topsort/sdk";

const auction: Auction = {
    //...
};

const config: Config = {
  apiKey: "API_KEY",
};

const topsortClient = new TopsortClient(config);

topsortClient.createAuction(auction)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```


#### Events - Before
```js
import { TopsortEvent, Config, reportEvent } from "@topsort/sdk";

const event: TopsortEvent = {
    //...
};

const config: Config = {
  apiKey: "API_KEY",
};

reportEvent(config, event)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

#### Events - After
```js
import { Event, Config, TopsortClient } from "@topsort/sdk";

const event: Event = {
    //...
};

const config: Config = {
  apiKey: "API_KEY",
};

const topsortClient = new TopsortClient(config);

topsortClient.reportEvent(event)
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

- Fix CI/CD for release process ([#38](https://github.com/Topsort/topsort.js/pull/38))
- Convert some parameters to optional ([#36](https://github.com/Topsort/topsort.js/pull/36))

## Version 0.2.1 (2024-08-05)

- Add support for Typescript with lower versions ([#37](https://github.com/Topsort/topsort.js/pull/37))
- Add support for optional timeout on Config ([#11](https://github.com/Topsort/topsort.js/pull/11))

## Version 0.2.0 (2024-07-29)

- Add `userAgent: string` as part of Config for requests ([#21](https://github.com/Topsort/topsort.js/pull/21))
- Add `retry: boolean` as part of `reportEvent` response ([#20](https://github.com/Topsort/topsort.js/pull/20))

## Version 0.1.0 (2024-07-19)

### Added

- Initial release of the SDK ([#1](https://github.com/Topsort/topsort.js/pull/1))
- Pull `reportEvent` from [Analytics.js](https://github.com/Topsort/analytics.js)
- Add function `createAuction`

