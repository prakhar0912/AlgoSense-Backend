# Repository Guidelines

## Project Structure & Architecture

- `src/entities/` contains domain models; `src/interfaces/` defines DAO, validator, use-case, queue, and notifier contracts.
- `src/use-cases/user/` and `admin/` hold business logic; `src/controllers/` coordinates requests.
- `src/infrastructure/` implements Express REST routes, MCP tools and HTML views, PostgreSQL access through `pg`, Zod validation, Auth0 authentication, and BullMQ queues.
- `src/config/` supplies environment configuration, dependencies, permissions, and scoring weights. `src/server.ts` starts the servers.
- Tests sit beside their layers in `tests/`; k6 scripts live in `src/infrastructure/api/express/load-tests/`, with reports in `load-test-reports/`.

Submission requests create pending records and enqueue evaluation. The separate worker evaluates submissions and updates scores within database transactions. Preserve transaction boundaries and concurrency protections. Consult `user-rating-system.md` and `implementation-decisions.md` when changing scoring or persistence.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: watch the REST server on port 3001 and MCP server on port 3000; load-testing mode disables MCP.
- `npm run dev-worker`: watch the submission evaluation worker.
- `npm run build`: compile TypeScript into `dist/`.
- `npx tsc --noEmit`: check production types; test files are excluded.
- `npm run start`: run the compiled servers via `node dist/server.js` after building.
- `npm test`: run Jest with ESM support.
- `npm test -- src/use-cases/user/tests/register.test.ts`: run one suite.
- `npm run build-mcp`: bundle the submitted-solution HTML view with Vite.

## Coding Style & Naming Conventions

Use strict TypeScript with NodeNext ESM, explicit type-only imports, and `.js` extensions for relative imports. Prefer two-space indentation and match surrounding quote/semicolon style; no formatter or linter is configured. Use camelCase filenames and functions, PascalCase classes, and existing snake_case domain fields. Inject dependencies through interfaces, validate input through validators, and wrap external failures in domain errors at use-case boundaries.

## Testing Guidelines

Use Jest 30, ts-jest, and `@jest/globals`. Name suites `*.test.ts`, with DAO suites distinguished as `*.unit.test.ts` or `*.integration.test.ts`. Mock dependencies for unit tests; verify guards, error wrapping, and downstream calls. No coverage threshold is configured. Integration suites use the configured PostgreSQL database and write fixtures; use a dedicated test database.

## Configuration & Contributions

Keep secrets in ignored `.env`; consult `src/config/app.ts` for PostgreSQL, Auth0, and OpenRouter variables. `TEST_USERS_TOKENS` must contain valid JSON even outside load testing. BullMQ currently connects to Redis at `localhost:6379`.

Recent commits use descriptive action phrases without enforced prefixes. Keep commits focused. PRs should explain behavior changes, link relevant issues, and report validation; include screenshots for MCP view changes.
