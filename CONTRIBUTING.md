# Topsort.js

This repository holds the official Topsort.js client library. This project is built with [TypeScript][typescript] and uses [Bun][bun] for package management and testing.

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

To install Topsort.js as a contributor, you need to have Bun installed on your machine. Follow the instructions on the [Bun website](https://bun.sh/) to install it.

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

## Building the SDK

To build the SDK, run the following command:

```sh
bun run build
```

This command cleans the `dist` directory and compiles the Typescript files into Javascript back to it

## Tests

### Unit Tests

To run the unit tests, use the following command:

```sh
bun run test
```

## Code Standards

We follow the coding standards set by Biome. Ensure your code follows these guidelines before submitting a pull request. You can run the formatter with the following command:
```sh
bun run format
```

To automatically fix issues:
```sh
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

`tsconfig.json`: TypeScript configuration.

`tsup.config.ts`: Configuration for the TSUP bundler.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.