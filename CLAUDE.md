# CLAUDE.md

## Project Overview

topsort.js contains the official Topsort web and React Native SDKs, their shared core,
and the private pre-production `@topsort/verification` browser runtime.

## Git Workflow

- **Never commit directly to `main`.** All changes go through PRs from a dedicated branch.
- Branch names should be descriptive (e.g., `feat/add-google-environment`, `fix/merge-pagination-offset`).
- **Large changes must be broken into stacked PRs** — each PR should be independently reviewable and represent a single logical unit of work (e.g., one PR adds the config, the next adds the validation schema, the next adds tests). Avoid monolithic PRs that touch many unrelated things at once.
- Each PR in a stack should be based on the previous branch, not `main`, so they can be reviewed and merged in order.
- **Admin override** (`gh pr merge --admin`) is only appropriate to bypass the review requirement when all CI checks pass. Never use it to force-merge a PR with failing CI — fix the failures first. Before using `--admin`, check whether the repo allows it (e.g. `gh api repos/{owner}/{repo}` or branch protection settings). If admin override is not permitted or you cannot verify it is, do not merge — ask the user instead.
- Keep branches up to date with `main` before merging — rebase or merge `main` into your branch to resolve conflicts locally, not in the merge commit.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Never approve or merge a PR that has unresolved review comments — address or explicitly dismiss each one first. Always check nested/threaded comments (e.g. replies under bot comments) as they may contain substantive issues not visible at the top level.
- Before merging with `--admin`, wait at least **5 minutes** after the PR is opened. This gives Bugbot and other async bots time to post their comments. After the wait, check all PR comments (including nested/threaded replies) for unresolved issues before merging.

## Tech Stack

| Component | Tool |
| --- | --- |
| Language | TypeScript (strict mode, ES2020 target) |
| Workspace | Bun workspaces under `packages/*` |
| Runtime and package manager | Bun 1.3.x (`bun install`, lockfile: `bun.lock`) |
| Bundler | bunup; web and React Native output ESM + CJS, verification outputs ESM |
| Unit testing | Bun test runner, with MSW for SDK HTTP tests and linkedom for verification DOM tests |
| Browser testing | Playwright; web SDK E2E plus verification coverage in Chromium, Firefox and WebKit |
| Linting and formatting | Biome 2 |
| Git hooks | Lefthook |
| CI | GitHub Actions |

## Key Commands

| Command | Description |
| --- | --- |
| `bun install` | Install workspace dependencies |
| `bun run build` | Build web, React Native and verification packages |
| `bun run test` | Typecheck and run web, React Native and verification unit tests |
| `bun run test:e2e` | Run the web SDK Playwright suite |
| `bun run format` | Check lint and formatting with Biome |
| `bun run format:fix` | Apply Biome fixes |
| `bun run prepare` | Install Lefthook git hooks |
| `bun run build:verification` | Build the verification package |
| `bun run test:verification` | Run verification unit tests |
| `bun run test:verification:browser` | Run verification Playwright tests in three engines |
| `bun run test:verification:package` | Pack and validate the verification npm artifact |

## Architecture

```
packages/
  core/                 # Shared TopsortClient, auction/event functions and public types
  web/                  # @topsort/sdk web transport, unit tests and browser E2E
  react-native/         # @topsort/react-native-sdk transport and opt-in offline event queue
  verification/        # @topsort/verification runtime, IAS adapter and React subpath
    src/
    test/               # Unit and DOM lifecycle tests
    e2e/                # Three-engine Playwright fixture and tests
    scripts/            # Packed-artifact validation
```

### Verification package

`packages/verification` is a private, pre-production browser package for attaching
provider verification to an exact rendered banner element. Its base entrypoint is
framework-neutral and its optional `@topsort/verification/react` subpath provides a
React callback-ref bridge. The current provider adapter intentionally accepts only the
confirmed IAS web-display POC tag grammar. It is not part of the npm publishing workflow.

### How It Works

1. `packages/core` contains the shared `TopsortClient`, auction/event functions and types.
2. Web and React Native packages inject their platform transport and bundle core into their artifacts.
3. `createAuction()` and `reportEvent()` call the public Topsort API after configuration validation.
4. Retryable event failures return `{ ok: false, retry: true }`; the React Native package can
   optionally persist and retry them through its offline queue.
5. Verification is independent of the API client. A marketplace passes the rendered element,
   `resolvedBidId` and campaign-configured IAS tag to its browser runtime after an auction winner is
   rendered.

## Code Conventions

- **Formatting**: Biome with 2-space indent, 100-char line width. Run `bun run format:fix` before committing.
- **Imports**: Biome auto-organizes imports (the `organizeImports` assist action is enabled).
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces/types. Files use kebab-case (e.g., `api-client.ts`, `validate-config.ts`).
- **Type declarations**: Shared types live in `src/types/` as `.d.ts` files. Internal interfaces (not exported) go in the same file as their usage.
- **Error handling**: Throw `AppError` (not native `Error`). `AppError` carries `status`, `statusText`, `body`, and a `retry` flag.
- **Verification adapter errors**: Provider adapters in `packages/verification` may use an
  internal typed error to classify browser-resource failures. These errors are converted to
  bounded diagnostics and never cross the package's public API; they must not introduce a
  dependency on the API-specific `@topsort/sdk-core` package.
- **Exports**: Barrel files (`index.ts`) re-export from subdirectories. The main entry is `src/index.ts`.
- **PR titles**: Must follow Conventional Commits format (enforced by CI). Must start with lowercase after the prefix. Allowed prefixes: `feat`, `fix`, `chore`, `docs`, `revert`, `build`, `ci`, `refactor`, `perf`, `test`.

## Testing

### Unit Tests

- Framework: Bun built-in test runner (`bun:test`).
- Location: each package's `test/` directory.
- HTTP mocking: web and React Native SDK tests use MSW; verification uses linkedom for DOM tests.
- Run all package tests with `bun run test`, or use a package-scoped command while developing.
- Coverage: Bun's built-in coverage (`--coverage`).

### E2E Tests

- Framework: Playwright (Chromium, Firefox, WebKit).
- Web SDK tests live under `packages/web/e2e` and run with `bun run test:e2e`.
- Verification tests live under `packages/verification/e2e` and run with
  `bun run test:verification:browser` in Chromium, Firefox and WebKit.
- Both suites use local fixtures and Playwright route interception; neither relies on a production
  marketplace.

Install Playwright browsers with `bunx playwright install` before running browser tests locally.

## CI/CD

### On Pull Requests

| Workflow                  | Trigger (paths)            | What it does                                       |
| ------------------------- | -------------------------- | -------------------------------------------------- |
| **Bun** (test-bun.yml) | TypeScript and workspace changes | Runs root tests and web E2E |
| **Verification** (test-verification.yml) | `packages/verification/**` and workspace config | Runs verification unit, type, browser, and packed-artifact checks |
| **Biome** (validate-biome.yml) | `**/*.ts`, `**/*.json` | Runs `biome ci` on changed files                   |
| **Conventional Commits** (validate-convco.yml) | All PRs | Validates PR title matches Conventional Commits    |
| **Typos** (validate-typos.yml) | `**/*.md`             | Spell-checks Markdown files                        |
| **GitHub Actions** (validate-actions.yml) | `.github/workflows/*.yml` | Lints workflow files with actionlint      |
| **Renovate** (validate-renovate.yml) | Renovate config changes | Validates Renovate config                    |

### On Push to `main`

- **Bun** (test-bun.yml) runs unit tests and uploads coverage.

### On Release (publish-to-npm.yml)

- A manually published GitHub release triggers the workflow.
- It installs locked dependencies, runs root tests and builds, and runs web E2E.
- It attempts to publish `@topsort/sdk` and `@topsort/react-native-sdk` with npm trusted publishing
  and provenance, skipping a package when that version already exists on npm.
- `@topsort/verification` is private and is not currently included in the release workflow.

## Pre-commit Hooks (Lefthook)

Lefthook runs these checks in parallel on `pre-commit`:

- **biome**: Lint/format staged `*.json` and `*.ts` files.
- **test**: Run `bun test` on staged `*.ts` files.
- **typos**: Spell-check staged `*.md` files (requires `typos-cli` installed locally).
- **actionlint**: Lint staged `.github/workflows/*.yml` files (requires `actionlint` installed locally).

## Gotchas

- **Browser E2E global**: There is no web SDK IIFE bundle or `window.Topsort` namespace. The E2E
  page imports the built ESM bundle and assigns `window.TopsortClient = TopsortClient` in
  `packages/web/e2e/public/index.html`.
- **`keepalive: true` default**: The web transport defaults `keepalive: true` when calling fetch. This is intentional for analytics/event tracking use cases where requests should survive page unloads. Consumers can override via `fetchOptions`.
- **`AppError` is not an `Error`**: `AppError` does not extend `Error` -- it is a plain class. `catch` blocks that check `instanceof Error` will not catch it. Always check `instanceof AppError`.
- **Bun test discovery**: Unit tests live in each package's `test/` directory and are selected by
  package-scoped scripts. E2E tests in `e2e/` are run separately through Playwright rather than
  by the unit-test command.
- **MSW handlers in `src/`**: Test mock handlers (`handlers.constant.ts`) live in `src/constants/` rather than in `test/` -- be aware of this if refactoring the source tree.
