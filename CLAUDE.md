# CLAUDE.md

## Project Overview

topsort.js is the official `@topsort/sdk` -- a fully typed TypeScript client for the Topsort Auctions and Events APIs. It is distributed as CJS, ESM, and IIFE bundles, making it usable in Node.js, modern bundlers, and directly in the browser via a `<script>` tag.

## Git Workflow

- **Never commit directly to `main`.** All changes go through PRs from a dedicated branch.
- Branch names should be descriptive (e.g., `feat/add-google-environment`, `fix/merge-pagination-offset`).
- **Large changes must be broken into stacked PRs** — each PR should be independently reviewable and represent a single logical unit of work (e.g., one PR adds the config, the next adds the validation schema, the next adds tests). Avoid monolithic PRs that touch many unrelated things at once.
- Each PR in a stack should be based on the previous branch, not `main`, so they can be reviewed and merged in order.
- **Admin override** (`gh pr merge --admin`) is only appropriate to bypass the review requirement when all CI checks pass. Never use it to force-merge a PR with failing CI — fix the failures first. Before using `--admin`, check whether the repo allows it (e.g. `gh api repos/{owner}/{repo}` or branch protection settings). If admin override is not permitted or you cannot verify it is, do not merge — ask the user instead.
- Keep branches up to date with `main` before merging — rebase or merge `main` into your branch to resolve conflicts locally, not in the merge commit.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Never approve or merge a PR that has unresolved review comments — address or explicitly dismiss each one first. Always check nested/threaded comments (e.g. replies under bot comments) as they may contain substantive issues not visible at the top level.
- Before merging with `--admin`, wait at least **5 minutes** after the last CI check finishes. This gives Bugbot and other async bots time to post their comments. After the wait, check all PR comments (including nested/threaded replies) for unresolved issues before merging.

## Tech Stack

| Component        | Tool                                                       |
| ---------------- | ---------------------------------------------------------- |
| Language         | TypeScript (strict mode, ES2020 target)                    |
| Runtime          | [Bun](https://bun.sh/) (v1.3.1)                           |
| Package manager  | Bun (`bun install`, lockfile: `bun.lock` / `bun.lockb`)   |
| Bundler          | [tsup](https://tsup.egoist.dev/) -- outputs CJS, ESM, IIFE |
| Unit testing     | Bun built-in test runner (`bun:test`) with [MSW](https://mswjs.io/) for HTTP mocking |
| E2E testing      | [Playwright](https://playwright.dev/) (Chromium, Firefox, WebKit) |
| Linting/Formatting | [Biome](https://biomejs.dev/) (v2)                      |
| Git hooks        | [Lefthook](https://github.com/evilmartians/lefthook)      |
| CI               | GitHub Actions                                             |
| Code coverage    | [Codecov](https://codecov.io/)                             |

## Key Commands

| Command              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `bun install`        | Install dependencies                                 |
| `bun run build`      | Build the SDK (CJS + ESM + IIFE via tsup)            |
| `bun test`           | Run unit tests (Bun test runner)                     |
| `bun run test:e2e`   | Build then run Playwright E2E tests                  |
| `bun run format`     | Check lint and formatting (Biome)                    |
| `bun run format:fix` | Auto-fix lint and formatting issues (Biome)          |
| `bun run serve:e2e`  | Start the local E2E test server (port 8080 by default) |
| `bun run prepare`    | Install Lefthook git hooks                           |

## Architecture

```
src/
  index.ts                        # Main entry -- re-exports functions/ and types/
  constants/
    endpoints.constant.ts         # Base URL (api.topsort.com) and API paths (v2/auctions, v2/events)
    handlers.constant.ts          # MSW mock handlers used in unit tests
  functions/
    index.ts                      # Re-exports TopsortClient
    topsort-client.ts             # TopsortClient class -- the primary public API
    auctions.ts                   # createAuction() -- calls the Auctions API
    events.ts                     # reportEvent() -- calls the Events API (with retry semantics)
  lib/
    api-client.ts                 # Low-level HTTP client (fetch-based, singleton)
    app-error.ts                  # Custom error class with status, statusText, body, retry
    validate-config.ts            # Validates that apiKey is present
    with-validation.ts            # Higher-order function that wraps handlers with config validation
  types/
    index.ts                      # Re-exports all type definitions
    shared.d.ts                   # Config interface (apiKey, host, timeout, userAgent, fetchOptions)
    auctions.d.ts                 # Auction request/response types
    events.d.ts                   # Event request/response types (impressions, clicks, purchases)
test/                             # Unit tests (Bun test runner + MSW)
e2e/                              # Playwright E2E tests
  server.ts                       # Bun-based static file server for E2E
  config.ts                       # Playwright constants (host URL)
  public/index.html               # Test HTML page that loads the IIFE bundle
dist/                             # Build output (gitignored)
```

### How It Works

1. Users instantiate `TopsortClient` with a `Config` object (apiKey required, optional host/timeout/userAgent/fetchOptions).
2. The client exposes two methods: `createAuction(auction)` and `reportEvent(event)`.
3. Each method is wrapped with `withValidation()` which checks the config before calling the handler.
4. Handlers use the singleton `APIClient` to make `POST` requests to the Topsort API.
5. `reportEvent` catches retryable errors (429 and 5xx) and returns `{ ok: false, retry: true }` instead of throwing.
6. The IIFE build exposes the SDK under the `Topsort` global (e.g., `new Topsort.TopsortClient(config)`).

## Code Conventions

- **Formatting**: Biome with 2-space indent, 100-char line width. Run `bun run format:fix` before committing.
- **Imports**: Biome auto-organizes imports (the `organizeImports` assist action is enabled).
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces/types. Files use kebab-case (e.g., `api-client.ts`, `validate-config.ts`).
- **Type declarations**: Shared types live in `src/types/` as `.d.ts` files. Internal interfaces (not exported) go in the same file as their usage.
- **Error handling**: Throw `AppError` (not native `Error`). `AppError` carries `status`, `statusText`, `body`, and a `retry` flag.
- **Exports**: Barrel files (`index.ts`) re-export from subdirectories. The main entry is `src/index.ts`.
- **PR titles**: Must follow Conventional Commits format (enforced by CI). Must start with lowercase after the prefix. Allowed prefixes: `feat`, `fix`, `chore`, `docs`, `revert`, `build`, `ci`, `refactor`, `perf`, `test`.

## Testing

### Unit Tests

- Framework: Bun built-in test runner (`bun:test`).
- Location: `test/` directory.
- HTTP mocking: [MSW](https://mswjs.io/) (Mock Service Worker) with handlers in `src/constants/handlers.constant.ts`.
- Run: `bun test`.
- Coverage: Built-in Bun coverage (`--coverage`), reported to Codecov in CI.
- Pattern: Each test file mirrors a source module. Use `describe`/`it` blocks. Set up MSW server in `beforeAll`, reset handlers in `afterEach`.

### E2E Tests

- Framework: Playwright (Chromium, Firefox, WebKit).
- Location: `e2e/` directory.
- Run: `bun run test:e2e` (builds first, then runs Playwright).
- The E2E server (`e2e/server.ts`) serves the built IIFE bundle and a test HTML page.
- Default port: 8080 (override with `SERVER_PORT` in `.env`).
- Tests use Playwright route interception to mock API responses.
- To add a new E2E test: create a `*.test.ts` file in `e2e/`, use `page.route()` to mock the API, and `page.evaluate()` to call `window.sdk.*`.

### Adding Tests

- For a new SDK function: add a unit test in `test/` using MSW to mock the HTTP call, and an E2E test in `e2e/` using Playwright route interception.
- Install Playwright browsers with `bunx playwright install` before running E2E tests locally.

## CI/CD

### On Pull Requests

| Workflow                  | Trigger (paths)            | What it does                                       |
| ------------------------- | -------------------------- | -------------------------------------------------- |
| **Bun** (test-bun.yml)   | `**/*.ts`, `./bun.lockb`  | Runs unit tests + Codecov upload; runs E2E tests   |
| **Biome** (validate-biome.yml) | `**/*.ts`, `**/*.json` | Runs `biome ci` on changed files                   |
| **Conventional Commits** (validate-convco.yml) | All PRs | Validates PR title matches Conventional Commits    |
| **Typos** (validate-typos.yml) | `**/*.md`             | Spell-checks Markdown files                        |
| **GitHub Actions** (validate-actions.yml) | `.github/workflows/*.yml` | Lints workflow files with actionlint      |
| **Renovate** (validate-renovate.yml) | Renovate config changes | Validates Renovate config                    |

### On Push to `main`

- **Bun** (test-bun.yml) runs unit tests and uploads coverage.

### On Release (publish-to-npm.yml)

- Runs unit tests and E2E tests, builds with tsup, publishes to npm with provenance (`npm publish --provenance --access public`).

## Pre-commit Hooks (Lefthook)

Lefthook runs these checks in parallel on `pre-commit`:

- **biome**: Lint/format staged `*.json` and `*.ts` files.
- **test**: Run `bun test` on staged `*.ts` files.
- **typos**: Spell-check staged `*.md` files (requires `typos-cli` installed locally).
- **actionlint**: Lint staged `.github/workflows/*.yml` files (requires `actionlint` installed locally).

## Gotchas

- **IIFE global name**: The IIFE bundle exposes the SDK as `window.Topsort` (configured in `tsup.config.ts` via `esbuildOptions.globalName`). Changing this will break browser consumers.
- **`publicDir` in tsup**: `tsup.config.ts` sets `publicDir: "e2e/public"`, which copies `e2e/public/index.html` into `dist/` during build. This is needed for E2E tests but means the HTML file ships to `dist/` -- it is excluded from the npm package via the `files` field in `package.json`.
- **`keepalive: true` default**: The SDK defaults `fetchOptions` to `{ keepalive: true }`. This is intentional for analytics/event tracking use cases where requests should survive page unloads. Consumers can override this.
- **`AppError` is not an `Error`**: `AppError` does not extend `Error` -- it is a plain class. `catch` blocks that check `instanceof Error` will not catch it. Always check `instanceof AppError`.
- **Bun test root**: `bunfig.toml` sets `root = "./test"` for unit tests. Only files in `test/` are picked up by `bun test`; E2E tests in `e2e/` are run separately via Playwright.
- **MSW handlers in `src/`**: Test mock handlers (`handlers.constant.ts`) live in `src/constants/` rather than in `test/` -- be aware of this if refactoring the source tree.
