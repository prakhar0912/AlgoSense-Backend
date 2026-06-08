# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run tests**: `npm test` (uses `--experimental-vm-modules` + Jest with ts-jest ESM preset)
- **Run a single test file**: `npx jest path/to/test.ts` (e.g. `npx jest src/use-cases/user/tests/register.test.ts`)
- **Type-check**: `npx tsc --noEmit`
- **Build**: `npx tsc`

## Tech Stack

- **Language**: TypeScript (ESM / NodeNext module resolution, `verbatimModuleSyntax`)
- **Testing**: Jest 30 + ts-jest (ESM preset), `@jest/globals`
- **Target**: Node.js (ESNext), output to `dist/`
- **No web framework / No ORM** — pure use-case architecture with injected interfaces

## Architecture

Clean/use-case architecture with dependency injection. The four layers are independent:

### src/entities/ — Domain models
Plain TypeScript classes with `!` (definite assignment) for required fields:
- [src/entities/user.ts](src/entities/user.ts) — `User` (role: 'admin' | 'user', banned, scores, submissions)
- [src/entities/authUser.ts](src/entities/authUser.ts) — `AuthUser extends User` (password, salt, retypedPassword)
- [src/entities/userScores.ts](src/entities/userScores.ts) — `UserScores` (approaches_score, consistency_score, edge_case_score, total_score, days_logged_in)
- [src/entities/problem.ts](src/entities/problem.ts) — `Problem` (title, description, testCases, approaches[], evaluation_criteria, difficulty: 1|2.5|6|7)
- [src/entities/submission.ts](src/entities/submission.ts) — `Submission` (user_id, problem_id, user_input, approach_score, edge_case_score, pass, etc.)

### src/interfaces/ — Contracts
DAO interfaces and shared types:
- [src/interfaces/user/userDAO.ts](src/interfaces/user/userDAO.ts) — `IUserDAO` (create, update, findForAuth, findByEmail, findById, findAll, toggleBanUser, setUserScores, etc.)
- [src/interfaces/problem/problemDAO.ts](src/interfaces/problem/problemDAO.ts) — `IProblemDAO` (create, update, delete, findById, list, findByName)
- [src/interfaces/submission/submissionDAO.ts](src/interfaces/submission/submissionDAO.ts) — `ISubmissionDAO` (create, viewById, viewByUser)
- [src/interfaces/useCase.ts](src/interfaces/useCase.ts) — `IUseCase<T>` with `call(...args): Promise<T>`
- [src/interfaces/validator.ts](src/interfaces/validator.ts) — `IValidator<T>` with `validate(body): IValidatorResult<T>`
- [src/interfaces/request.ts](src/interfaces/request.ts) — `IRequest` (token, body, params)
- [src/interfaces/error.ts](src/interfaces/error.ts) — `IError` (name, message, httpStatusCode, details)
- [src/interfaces/paginated.ts](src/interfaces/paginated.ts) — `IPaginated<T>` (data[], pagination.page/perPage)

### src/use-cases/ — Business logic
Each use case implements `IUseCase<T>`, receives all dependencies via constructor injection:
- [src/use-cases/user/](src/use-cases/user/) — register, login, authorize, submitSolution, updateConsistencyScore, updateUserScore, updatePassword, updateUserSettings, listProblems, getProblem, showProblem, getAllProblems, deleteUser
- [src/use-cases/admin/](src/use-cases/admin/) — authorizeAdmin, createProblem, updateProblem, deleteProblem, listUsers, toggleBanUser, removeUser, updateUser
- Tests live in [src/use-cases/user/tests/](src/use-cases/user/tests/)

### src/errors/ — Domain error classes
All implement `IError` with HTTP status codes:
- `ValidationError` (400) — invalid input data
- `UnauthorizedError` (401) — auth/token/permission failures
- `NotFoundError` (404) — missing resources
- `InternalServerError` (500) — unexpected failures (always wraps the underlying error)

## Patterns

- **Error handling**: Every external call (DAO, injected function) wraps in try-catch → throws a domain error. Never let infrastructure errors propagate raw.
- **Validation**: Input validation is delegated to an injected `IValidator<T>`. The use case checks `validationResult.success` and throws `ValidationError` with the error details array.
- **Testing pattern**: All dependencies mocked with `jest.fn()`. Tests verify call ordering (`toHaveBeenCalledWith`), early-exit guards (ensure downstream functions NOT called on failure), and error wrapping (rejects `.toMatchObject` with the domain error class). Use `@jest/globals` imports.
- **ESM**: All imports include `.js` extensions (TypeScript convention with `verbatimModuleSyntax` + NodeNext).