# Topsort SDK

This repository holds the official Topsort javascript client library. This project is built with [TypeScript][typescript] and uses [Bun][bun] for package management and testing.

[typescript]: https://www.typescriptlang.org
[bun]: https://bun.sh/

## How to contribute

We'd love to accept your patches and contributions to this project. Bellow, you can find the guidelines on how to setup the project locally, test and code standards for top-notch contributions.

## Table of Contents

- [Reporting Issues](#reporting-issues)
- [Local Installation](#local-installation)
- [Running Locally](#running-locally)
- [Building the SDK](#building-the-sdk)
- [Tests](#tests)
  - [Unit Tests](#unit-tests)
  - [E2E Tests](#e2e-tests)
- [Code Standards](#code-standards)
- [Submitting contributions](#submitting-contributions)
  - [Commit Messages](#commit-messages)
- [Configuration](#configuration)
- [License](#license)

## Reporting issues

Bugs, feature requests, and development-related questions should be directed to
our [GitHub issue tracker](https://github.com/Topsort/topsort.js/issues).  If
reporting a bug, please try and provide as much context as possible such as
your operating system, Bun version, and anything else that might be relevant to
the bug. For feature requests, please explain what you're trying to do, and
how the requested feature would help you do that.

Security related bugs can either be reported in the issue tracker, or if they
are more sensitive, emailed to <marcio@topsort.com>.

## Local Installation

To modify or interact with the source code, you need to install Bun (the runtime). Follow the instructions on the [Bun website](https://bun.sh/) to install it.

You will additionally need [typos](https://github.com/crate-ci/typos) for validating documentation and [actionlint](https://github.com/rhysd/actionlint) for validating actions. Install it through your package manager of choice (on MacOS: `brew install typos-cli actionlint`).

Clone the repository and install the dependencies:

```bash
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

This will set up a local `@topsort/sdk` library to be used on another local project.

On the secondary project, if using bun, run:

```bash
bun link @topsort/sdk
```

Or add it in dependencies in the package.json file:

```bash
"@topsort/sdk": "link:@topsort/sdk"
```

## Building the SDK

To build the SDK, run the following command:

```bash
bun run build
```

This command compiles Typescript into Javascript, suitable for use in more runtimes and browsers.

## Tests

### Unit Tests

To run the unit tests, use the following command:

```bash
bun run test
```

### E2E Tests

By default, the application is set to serve a web browser in the port `8080` for Playwright. If this port is already being used on your local machine, make sure you change the port in your `.env`.`SERVER_PORT`.

First, make sure you have all the dependencies installed:

```bash
bun install
```

To run the end-to-end tests, make sure you have installed the browsers supported by playwright by running this command:

```bash
bunx playwright install
```

Please refer to [Playwright Documentation](https://playwright.dev/docs/browsers) for details.

Then, make sure you have the latest bundled files before running it. Use the following commands:

```bash
bun run build
bun run test:e2e
```

## Code Standards

We follow the coding standards set by Biome. Ensure your code follows these guidelines before submitting a pull request. You can run the formatter with the following command:

```bash
bun run format
```

To automatically fix issues:

```bash
bun run format:fix
```

## Submitting Contributions

### Commit Messages

We do conventional commits, so it will fail on checker with capital case after commit prefix. Refer to [Conventional Commits spec](https://www.conventionalcommits.org/en/v1.0.0/) or to [Amannn's Github Action for Semantic Pull Request](https://github.com/amannn/action-semantic-pull-request) for details.

1. Fork the repository.
2. Create a new branch (git checkout -b feat/branch).
3. Make your changes and commit them (git commit -m 'feat: adding new feature').
4. Push to the branch (git push origin feat/branch).
5. Open a pull request.

## Configuration

The SDK uses following configuration files:
- `tsconfig.json`: TypeScript configuration.
- `tsup.config.ts`: Configuration for the TSUP bundler.
- `playwright.config.ts`: Configuration for E2E tests runner

We also have the following variables as part of the `.env` file:
- `PLAYWRIGHT_PORT`: Port used to run the local web browser to run Playwright E2E tests.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
