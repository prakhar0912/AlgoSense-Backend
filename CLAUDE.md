# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure & Architecture

- `src/entities/` contains domain models; `src/interfaces/` defines DAO, validator, use-case, queue, and notifier contracts.
- `src/use-cases/user/` and `admin/` hold business logic; `src/controllers/` coordinates requests.
- `src/infrastructure/` implements Express REST routes, MCP tools and HTML views, PostgreSQL access through `pg`, Zod validation, Auth0 authentication, and BullMQ queues.
- `src/config/` supplies environment configuration, dependencies, permissions, and scoring weights. `src/server.ts` starts the servers.
- MCP HTML templates and browser TypeScript live in `src/infrastructure/mcp/outputFormatters/`. `build-scripts/build-mcp-resources.mjs` uses `vite.config.ts` to generate self-contained HTML in ignored `dist-mcp-resources/`, separate from the compiled backend in `dist/`.
- Tests sit beside their layers in `tests/`; k6 scripts live in `src/infrastructure/api/express/load-tests/`, with reports in `load-test-reports/`.

Submission requests create pending records and enqueue evaluation. The separate worker evaluates submissions and updates scores within database transactions. Preserve transaction boundaries and concurrency protections. Consult `user-rating-system.md` and `implementation-decisions.md` when changing scoring or persistence.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: watch the REST server on port 3001 and MCP server on port 3000; load-testing mode disables MCP.
- `npm run dev-worker`: watch the submission evaluation worker.
- `npm run build`: compile `src/**/*.ts` into `dist/`; does not build MCP HTML resources.
- `npx tsc --noEmit`: check source types; test files, the root Vite configuration, and build scripts are outside this check.
- `npm run start`: run the compiled servers via `node dist/server.js` after building the backend and MCP resources.
- `npm test`: run Jest with ESM support.
- `npm test -- src/use-cases/user/tests/register.test.ts`: run one suite.
- `npm run build-mcp-resources`: build all five MCP HTML views using `node build-scripts/build-mcp-resources.mjs`; replaces the old `build-mcp` command.
- `npm run test-mcp`: launch the MCPJam inspector for manual MCP testing.

## MCP Resource Build & Runtime

The resource build script processes `submittedSolution`, `displayProblem`, `paginatedProblem`, `userProfile`, and `userSubmissions` sequentially. Each page name is passed as Vite's `mode` to select one HTML entry through `build.rolldownOptions.input`. `vite-plugin-singlefile` inlines JavaScript and CSS. Only the first build clears `dist-mcp-resources/`; subsequent builds preserve earlier pages. Keep the Vite output separate from `dist/` and use relative script paths in HTML because Vite's root is `src/infrastructure/mcp/outputFormatters/`.

Edit source templates and scripts, not generated HTML. Add new views to the build script's `pages` list and register matching MCP resources. Rebuild after UI changes; `npm run dev` watches the server but does not rebuild HTML. Build both outputs before deployment and package `dist-mcp-resources/` alongside `dist/`.

Both `src/infrastructure/mcp/routes/user.ts` and `src/infrastructure/mcp/routes/problem.ts` read `dist-mcp-resources/*.html` relative to the process working directory, so run servers from the project root (or the equivalent application root in a container).

## Authentication & Error Handling

REST authentication uses the `authenticate` wrapper in `src/infrastructure/utils/auth/auth0/auth.ts`, mounted before registration/login middleware and protected routes. Preserve Auth0 audience, issuer, and RS256 validation. Successful authentication calls `next()`; recognized JWT authentication failures are forwarded with `next(new UnauthorizedError(...))` (domain HTTP 401), and unexpected failures use `InternalServerError` (HTTP 500). Let the centralized Express error handler serialize these domain errors. MCP authentication is handled separately in `mcpAuth.ts` and the MCP server setup.

Known auth handling gap: the installed library's `InsufficientScopeError` extends its `UnauthorizedError`. The current general check catches it before the dedicated insufficient-permission branch, so it currently receives the invalid/expired-token message and HTTP 401. Check specific subclasses before their parent when updating this mapping.

## Coding Style & Naming Conventions

Use strict TypeScript with NodeNext ESM, explicit type-only imports, and `.js` extensions for relative imports. Prefer two-space indentation and match surrounding quote/semicolon style; no formatter or linter is configured. Use camelCase filenames and functions, PascalCase classes, and existing snake_case domain fields. Inject dependencies through interfaces, validate input through validators, and wrap external failures in domain errors at use-case boundaries.

## Testing Guidelines

Use Jest 30, ts-jest, and `@jest/globals`. Name suites `*.test.ts`, with DAO suites distinguished as `*.unit.test.ts` or `*.integration.test.ts`. Mock dependencies for unit tests; verify guards, error wrapping, and downstream calls. No coverage threshold is configured. Integration suites use the configured PostgreSQL database and write fixtures; use a dedicated test database.

For authentication changes, verify successful pass-through, known token/request failures, insufficient scope, and unexpected errors through the domain error handler. For MCP build or view changes, run `npm run build-mcp-resources`, verify all five HTML outputs, and check affected resources in the MCP inspector; backend type checking alone does not validate resource paths or HTML bundling.

## Configuration & Contributions

Keep secrets in ignored `.env`; consult `src/config/app.ts` for PostgreSQL, Auth0, and OpenRouter variables. `TEST_USERS_TOKENS` must contain valid JSON even outside load testing. BullMQ currently connects to Redis at `localhost:6379`.

Recent commits use descriptive action phrases without enforced prefixes. Keep commits focused. PRs should explain behavior changes, link relevant issues, and report validation; include screenshots for MCP view changes.
