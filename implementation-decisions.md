# Implementation Decisions

This document records implementation choices we make across the project and why we make them.

## 2026-07-04: Use Argon2id for password hashing instead of PBKDF2

We are standardizing on Argon2id for new password hashing code.

### Why this decision

- Argon2id is the variant recommended when we want a safe default. The Argon2 RFC explicitly says to choose Argon2id if we do not have a special reason to prefer another variant, or if side-channel attacks are a realistic concern.
- Argon2id gives us a better balance than Argon2i or Argon2d. Argon2d favors maximum resistance to brute-force hardware but increases side-channel exposure. Argon2i favors side-channel resistance but gives weaker resistance to some time-memory tradeoff attacks. Argon2id is the hybrid intended to preserve the practical benefits of both.
- Argon2id is more resistant than PBKDF2 against modern offline cracking hardware because it is memory-hard, not just compute-hard. That matters if an attacker ever gets a copy of our password hashes and tries to crack them on GPUs or ASICs.
- Argon2id is still fast enough for our backend use case. The cost is paid during password hash and verify operations, which are low-frequency requests compared with ordinary reads. Modern guidance and real-world reports show that Argon2id can remain responsive while still increasing attacker cost materially.

### Why not PBKDF2

- PBKDF2 is still acceptable in some environments, but it is primarily a fallback choice now, not the preferred one.
- PBKDF2 scales mostly by increasing iterations. That raises cost for us and the attacker in roughly the same proportion.
- Argon2id lets us tune memory as well as time, which makes parallel cracking less efficient on GPUs and similar hardware.
- OWASP recommends Argon2id first and reserves PBKDF2 mainly for cases such as FIPS-140 compliance.

### Why not Argon2i or Argon2d

- We are not optimizing for a narrow edge case where only side-channel resistance or only raw GPU resistance dominates.
- For a web application backend, a balanced default is the right engineering choice. Argon2id is the mainstream recommendation for that balance.

### Practical implication for this project

- New password hashing utilities should emit and verify Argon2id hashes using the standard encoded Argon2 string format.
- Existing PBKDF2-based code can remain temporarily where needed for compatibility, but new work should target Argon2id unless there is a documented exception.

### Sources

- [RFC 9106: Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications](https://www.rfc-editor.org/rfc/rfc9106.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [When to use Argon2i vs Argon2d vs Argon2id?](https://crypto.stackexchange.com/questions/72416/when-to-use-argon2i-vs-argon2d-vs-argon2id)
- [PBKDF2 vs Argon2 - which is better?](https://community.bitwarden.com/t/pbkdf2-vs-argon2-which-is-better/59187)

## 2026-07-07: Use Auth0 instead of self-managed password and JWT authentication

We are moving from locally managed password hashing and locally issued JWTs to Auth0-managed authentication.

### Why this decision

- Auth0 is a stronger default than a custom password-and-JWT stack because it centralizes identity, credential handling, token issuance, and token lifecycle in a platform built for that purpose.
- Our previous model required the backend to own several security-sensitive responsibilities directly: password hashing, password verification, token generation, token parsing, token expiry handling, and future additions such as MFA, breach detection, and account recovery.
- With Auth0, the application no longer needs to compare password hashes locally or mint its own login tokens from a local user id. Auth0 authenticates the user and returns standards-based OAuth/OIDC tokens instead.
- Auth0's guidance also makes the separation of responsibilities clearer: applications authenticate through Auth0, while APIs validate access tokens, verify audience, and verify scopes before serving protected endpoints.
- Cost, it is cheaper to get a secure relatively free solution for our current needs.

### Why this is better than our previous local JWT approach

- A self-managed JWT system is easy to get working, but the difficult part is not token creation itself. The difficult part is safely operating the whole authentication lifecycle over time.
- Auth0 reduces the amount of authentication code we need to maintain ourselves, which lowers the chance of implementation mistakes in token issuance, verification, claim design, and security hardening.
- Auth0 gives us a path to stronger features without redesigning the auth layer later, including hosted login flows, MFA, attack protection, and standardized OIDC claims.
- Auth0 tokens fit better with modern API authorization practices because they are issued as part of OAuth/OIDC flows and are designed to be validated for audience and scope by the API.

### Why not continue with backend-managed login tokens

- Our old design treated authentication as an internal utility problem: hash a password, compare it, then sign a token from a local user id. That is workable for simple systems, but it leaves identity security policy entirely on us.
- It also couples our login and registration use cases to implementation details that should not be core business logic, such as password storage format and local JWT claim construction.
- Auth0 lets us decouple identity from the rest of the application. Our backend can focus on application-specific concerns like roles, banned status, scores, submissions, and user profile data.

### Practical implication for this project

- Auth0 should become the source of truth for credential verification and token issuance.
- The backend should validate Auth0 access tokens instead of trusting locally generated login JWTs.
- The backend should map the Auth0 user identifier, typically the `sub` claim, to a local user record for application-specific authorization and data access.
- Password hashing and password comparison utilities should no longer be the long-term primary auth path for users managed by Auth0.
- New authorization work should be designed around OAuth/OIDC token validation, expected audience, and required scopes.


### Sources

- [Auth0: Resource Owner Password Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/resource-owner-password-flow)
- [Auth0: Validate Access Tokens](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens)
- [Auth0: OpenID Connect Scopes](https://auth0.com/docs/get-started/apis/scopes/openid-connect-scopes)

## 2026-07-08: Move Auth0 user resolution to the implementation layer

We are moving user authentication and authorization into the implementation layer because Auth0 owns the identity flow.

### Why this decision

- The controller layer should remain free of Auth0-specific concerns so it only handles application behavior.
- The implementation layer is the right place to validate Auth0 access tokens, resolve the authenticated user, and enforce authorization before controller logic runs.
- This keeps the controller boundary stable even if the underlying identity provider changes later.

### Practical implication for this project

- The implementation layer should resolve the authenticated user and pass the validated `userId` into `IRequest`.
- Every controller function should receive an `IRequest` that already contains the validated `userId`.
- Controllers should use that `userId` directly instead of performing token parsing or Auth0 validation themselves.
- `IRequest` should represent the already authenticated request context, not the raw authentication mechanism.

Moving from race condition imune SubmitSolution usecase to job queue architecture
1. Previous implementation flaws: The REST API directly called the AI provider while handling the user's HTTP request. This meant requests stayed open for several seconds, API performance was tied to AI latency/availability, traffic spikes could overwhelm the AI provider, and failures/retries were harder to handle reliably. It also tightly coupled submission handling with AI evaluation and Elo updates.

2. New architecture: The REST API now saves the submission to PostgreSQL with a pending status, adds a lightweight { submissionId } job to a queue such as Redis/BullMQ, and immediately returns the submissionId to the client. A separate AI worker consumes the job, loads the submission, calls the AI provider, validates the result, calculates scores, updates the submission, and performs the Elo transaction. The client polls GET /submissions/:id until the status becomes evaluated.

3. Why it's better: The API remains fast and responsive regardless of AI latency, while the queue absorbs traffic spikes and allows you to control AI concurrency. Workers can retry failed AI requests and scale independently from the API. Most importantly, it gives you a reliable place to handle evaluation and transactional Elo updates, making the system more resilient, scalable, and much easier to load-test.
