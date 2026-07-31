# API Reference — Authentication

The Authentication resource exposes three endpoints under the `/auth` route group: `POST /auth/login`, `POST /auth/register`, and `POST /auth/logout`. Login is **public** and its handler is written to issue a signed JWT that clients present as `Authorization: Bearer <token>` on every secured endpoint; logout is **declared** auth-protected by `AuthMiddleware()`; and register is **Designed** — its route is wired but no handler method is defined in code yet. Login and logout are **Source-present (non-buildable)**: both handler methods exist in source, but the `api` package does not compile (it imports the absent `middleware` package, and the `internal/core/auth` service the handlers call is likewise absent) and the backend has no `go.mod`, so no request is served today. `Source: backend/internal/api/routes.go:L17-L22`, `Source: backend/internal/api/handlers/auth.go:L5`.

These paths are served at the router root and carry **no `/api/v1` prefix** — the design corpus documents a `/api/v1/...` target, but the code registers the bare `/auth/...` paths shown here. Path and versioning conventions are covered in the [API reference overview](overview.md). `Source: backend/internal/api/routes.go:L9-L22`.

## Maturity Legend

Every endpoint on this page is labeled with the project-wide maturity discipline:

- **Implemented** — present in code, building, and functional today. Per the single operational-truth vocabulary in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md), this label is **reserved** and **nothing qualifies for it** at this checkpoint; it is not applied on this page.
- **Source-present (non-buildable)** — the handler method is written in source, but the containing package does not compile (no `go.mod`; the imported `middleware` and `internal/core/auth` packages are absent). No request/response behavior may be asserted as running. Equivalent to *Implemented-with-defects* on the architecture pages.
- **Designed** — specified (a route or intended contract), but the backing implementation is absent in code.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.

The consolidated maturity reconciliation between the design corpus and the on-disk scaffold is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Endpoint Summary

| Endpoint | Auth | Maturity |
|----------|------|----------|
| `POST /auth/login` | Public | Source-present (non-buildable) |
| `POST /auth/register` | Public | Designed |
| `POST /auth/logout` | Bearer | Source-present (non-buildable) |

`Source: backend/internal/api/routes.go:L19-L21`.

> **What `Public` means here (and one contradiction it hides).** `Public` denotes that **no middleware is attached to the route in the router** — true for `/auth/login` and `/auth/register`, which are declared inside the `/auth` group without a middleware argument, while `/auth/logout` opts in individually. `Source: backend/internal/api/routes.go:L17-L22`. The composition root, however, applies `middleware.AuthMiddleware()` **engine-wide** with no public-path exemption, which would gate login itself behind a token the caller cannot yet hold. `Source: backend/cmd/server/main.go:L76`. The two statements do not conflict at runtime today only because they configure **two different engines**: the engine `main.go` builds and serves has the global middleware but **no routes**, while the engine `SetupRouter()` registers all 18 routes on is **returned and then discarded**. `Source: backend/cmd/server/main.go:L50-L52,L60`, `Source: backend/internal/api/routes.go:L9-L10`. This reference documents the **router's** contract, which is what the service is written to serve. The wiring defect is analyzed in [`../architecture/backend.md`](../architecture/backend.md#router-signature-mismatch--and-two-engines-neither-of-which-works-source-present-defect-correction-designed) and catalogued as Defect 1 in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md#defect-catalog).

## POST /auth/login

**Maturity:** Source-present (non-buildable). **Auth:** Public — no middleware is attached to this route. `Source: backend/internal/api/routes.go:L19`.

**Description.** The handler is written to authenticate a user with a username and password and return a signed JWT. It binds the JSON body into a struct whose `Username` and `Password` fields are both `binding:"required"`, delegates verification to `authService.Login(username, password)`, and returns the resulting token, which is intended to be the bearer credential clients attach to all secured endpoints. This does not run today: `authService` is of type `*auth.AuthService` from the absent `internal/core/auth` package, so the handler does not compile. Because the token is minted entirely inside that absent auth service, **JWT issuance is Designed** — no token is signed or returned at runtime today, and the intended contract to keep the issued token out of logs is likewise Designed, not an evidenced guarantee. `Source: backend/internal/api/handlers/auth.go:L5,L21-L39`, `Source: frontend/src/services/api.ts:L11-L16`.

### Request

Headers: `Content-Type: application/json`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | `string` | Yes | Bound with `binding:"required"`; a missing or empty value yields `400`. `Source: backend/internal/api/handlers/auth.go:L23`. |
| `password` | `string` | Yes | Bound with `binding:"required"`; a missing or empty value yields `400`. Handling this credential so that it is **never logged or returned** is a **Designed** security contract, not a runtime guarantee evidenced today — the `internal/core/auth` service that would verify it and any log-redaction path are absent, so no code has been observed to enforce it. `Source: backend/internal/api/handlers/auth.go:L24`. |

### Responses

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `{ "token": "<jwt>" }` | Authentication succeeded; the JWT is returned for use as a bearer token. `Source: backend/internal/api/handlers/auth.go:L38`. |
| `400 Bad Request` | `{ "error": "Invalid request payload" }` | The JSON body was missing, malformed, or omitted a required field. `Source: backend/internal/api/handlers/auth.go:L27-L29`. |
| `401 Unauthorized` | `{ "error": "Invalid credentials" }` | The username/password pair was rejected by the auth service. `Source: backend/internal/api/handlers/auth.go:L33-L35`. |

### Example

Request:

```bash
read -rs -p 'Password: ' PASSWORD && echo
printf '{"username":"alice","password":"%s"}' "$PASSWORD" \
  | curl -X POST http://localhost:8080/auth/login \
      -H 'Content-Type: application/json' \
      --data-binary @-
unset PASSWORD
```

> **Note.** The base URL `http://localhost:8080` is **illustrative** — no server bind address is configured in code (the frontend Axios client defaults to `https://api.example.com`, not localhost); see the [overview](overview.md#authentication-model). The password is **read via a silent prompt (`read -rs`) and streamed to `curl` over stdin (`--data-binary @-`)** rather than passed with `-d '…'` on the command line, so the credential never lands in the process argument list (visible via `ps`) or in shell history; `printf` is a shell builtin in bash/zsh, so the expanded value is not handed to a separate process either, and `unset` clears it afterward. For a password containing JSON-special characters (`"` or `\`), build the body with a tool that escapes it and reads from the environment — for example `PASSWORD="$PASSWORD" jq -nc '{username:"alice",password:env.PASSWORD}' | curl … --data-binary @-` — which also keeps the secret out of argv. Choose a value satisfying the **Designed** password policy (≥12 chars with uppercase, lowercase, number, and special character); note that **no password-complexity validation runs in code today** — the policy is Designed only. `Source: documentation/Technical Specifications.md:L474-L478`, `Source: frontend/src/services/api.ts:L4`.

Response (`200 OK`):

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.PLACEHOLDER_CLAIMS.PLACEHOLDER_SIGNATURE" }
```

## POST /auth/register

**Maturity:** Designed. **Auth:** Public — no middleware is attached to this route. `Source: backend/internal/api/routes.go:L20`.

**Note — not implemented today.** The router registers `POST /auth/register` against `AuthHandler.Register`, but **no `Register` method is defined** in `backend/internal/api/handlers/auth.go`. The endpoint therefore resolves to a missing handler and is documented here as its intended (Designed) contract only. `Source: backend/internal/api/routes.go:L20`, `Source: backend/internal/api/handlers/auth.go` (no `Register` method).

**Description.** The intended contract registers a new user within an organization and returns the created user record. The request and response shapes below are **inferred** from the `User` entity and are subject to change when the handler is implemented; the `User` entity fields are defined canonically in [Fig M1 — Data Model ERD](../architecture/data-model.md#fig-m1--data-model-erd). `Source: backend/internal/db/schema.go:L20-L30`.

### Request (inferred)

Headers: `Content-Type: application/json`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | `string` | Yes | Login username for the new user. `Source: backend/internal/db/schema.go:L24`. |
| `email` | `string` | Yes | Contact email for the new user. `Source: backend/internal/db/schema.go:L25`. |
| `password` | `string` | Yes | Plaintext credential supplied at registration. The intended contract — hash it, persist **only** the resulting `PasswordHash`, and **never** return or log the plaintext — is **Designed**, not an evidenced guarantee: the `Register` handler and the hashing code are absent, so no code hashes this value or excludes it from responses today. `Source: backend/internal/db/schema.go:L26`. |
| `organizationId` | `string` (uuid) | Yes | The organization the user is created under. `Source: backend/internal/db/schema.go:L23`. |

### Responses (inferred)

| Status | Body | Meaning |
|--------|------|---------|
| `201 Created` | `User` record (without `PasswordHash`) | Intended success: the user was registered. **Designed** — not returned by any current handler. `Source: backend/internal/api/routes.go:L20`. |
| `400 Bad Request` | `{ "error": "Invalid request payload" }` | Intended validation failure for a missing or malformed body. **Designed**. `Source: backend/internal/api/routes.go:L20`. |

### Example (inferred)

Request:

```bash
read -rs -p 'Password: ' PASSWORD && echo
printf '{"username":"alice","email":"alice@example.com","password":"%s","organizationId":"3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11"}' "$PASSWORD" \
  | curl -X POST http://localhost:8080/auth/register \
      -H 'Content-Type: application/json' \
      --data-binary @-
unset PASSWORD
```

> **Note.** As with login, the password is read via a silent prompt and streamed over stdin so it never appears in argv or shell history (see the login example's note for the JSON-special-character variant). This request is **Designed** — no `Register` handler exists to accept it today. `Source: backend/internal/api/handlers/auth.go` (no `Register` method).

Response (`201 Created`, Designed):

```json
{ "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "organizationId": "3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11",
  "username": "alice", "email": "alice@example.com", "role": "Operator" }
```

> **Serialization caveat (Designed contract).** The camelCase field names above (`id`, `organizationId`, …) and the omission of `PasswordHash` describe the **Designed** response DTO. The `User` struct in code carries **no `json` tags** and embeds `gorm.Model`, so were it marshaled as-declared the actual keys would be **PascalCase** (`ID`, `OrganizationID`, `Username`, `Email`, `Role`), a promoted `DeletedAt` would appear, and — because `PasswordHash` has no `json:"-"` — the hash would be **exposed**. See [Response Serialization](overview.md#response-serialization--designed-camelcase-contract-vs-actual-pascalcase-output) for the full reconciliation. The example password is the synthetic, policy-conformant placeholder described above. `Source: backend/internal/db/schema.go:L20-L30`.

## POST /auth/logout

**Maturity:** Source-present (non-buildable). **Auth:** Bearer — the router attaches `middleware.AuthMiddleware()` to this route within the `/auth` group. `Source: backend/internal/api/routes.go:L21`.

**Description.** The handler is written to invalidate the caller's session: it reads the authenticated `userID` from the Gin context (intended to be populated by the auth middleware), passes it to `authService.Logout(userID)`, and confirms success. The request takes **no body**; the caller is identified solely by the bearer token. This does not run today — both the `middleware` that would populate `userID` and the `internal/core/auth.AuthService` are absent, so the handler does not compile. `Source: backend/internal/api/handlers/auth.go:L41-L55`.

### Request

Headers: `Authorization: Bearer <token>` (required).

This endpoint accepts no request body. `Source: backend/internal/api/handlers/auth.go:L41-L55`.

### Responses

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `{ "message": "Logged out successfully" }` | The session was invalidated. `Source: backend/internal/api/handlers/auth.go:L54`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | No `userID` was present in context — the request was not authenticated. `Source: backend/internal/api/handlers/auth.go:L42-L45`. |
| `500 Internal Server Error` | `{ "error": "Failed to logout" }` | The auth service returned an error while invalidating the session. `Source: backend/internal/api/handlers/auth.go:L48-L51`. |

### Example

Request:

```bash
curl -X POST http://localhost:8080/auth/logout \
  -H 'Authorization: Bearer <token>'
```

Response (`200 OK`):

```json
{ "message": "Logged out successfully" }
```

## Authentication Stack Maturity

The authentication endpoints are **source-present but do not run** — the stack is only partially wired, and the maturity of the surrounding pieces is called out here so the source-present labels above are read in context.

- **Reused (source-present, non-buildable).** The router is written to install Gin's built-in access logging and panic recovery via `gin.Logger()` and `gin.Recovery()`, intended to apply to all `/auth` routes. These are third-party Gin features wired in source, but they cannot run because the `api` package does not compile. `Source: backend/internal/api/routes.go:L13-L14`.
- **Designed (imported but absent).** `middleware.AuthMiddleware()` — attached to `POST /auth/logout` and to every non-auth route group — and `internal/core/auth.AuthService`, which backs `AuthHandler.Login` and `AuthHandler.Logout`, are imported by the code but are **not present** in the repository. The `Login` and `Logout` handlers are **source-present (non-buildable)** request/response code, and they depend on this Designed auth core to function at runtime. `Source: backend/internal/api/routes.go:L21,L25`, `Source: backend/internal/api/handlers/auth.go:L21-L55`.

### Client-side session handling (frontend defects)

The frontend session helpers in `frontend/src/services/auth.ts` diverge from a server-authoritative model, and both gaps are **source-present defects** (documented, not fixed):

- **Logout is local-only.** `logout()` only calls `removeItem('jwt_token')` to drop the token from client storage; it **never calls `POST /auth/logout`**, so any server-side session or token revocation is not triggered from the UI. A `HUMAN ASSISTANCE NEEDED` comment notes that application-state clearing is also unfinished. `Source: frontend/src/services/auth.ts:L19-L25`.
- **Token expiry is not checked.** `isAuthenticated()` returns `true` whenever a token *string is present*; the JWT `exp`-claim verification is commented out (`HUMAN ASSISTANCE NEEDED`), so an **expired token is treated as valid** on the client. `Source: frontend/src/services/auth.ts:L27-L43`.
- **No 401 refresh.** The Axios response interceptor carries a `HUMAN ASSISTANCE NEEDED` TODO for refreshing tokens on `401`; today it simply rejects, so there is no client-side token-refresh path. `Source: frontend/src/services/api.ts:L19-L27`.

The full Implemented / Provisioned / Designed reconciliation, including the router-signature and missing-package gaps, is documented in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## User Authentication & Authorization Guide (UA-001)

This task-oriented guide walks an end user and an administrator through the UA-001 workflow. Because the authentication stack is **source-present (non-buildable)** and its guards are **Designed**, each task states what a user *would* do and what actually happens today. The six UA-001 sub-requirements are enumerated in the SRS. `Source: documentation/Software Requirements Specifications (SRS).md:L428-L433`.

**Task 1 — Log in (UA-001-1).** Send `POST /auth/login` with `{ "username", "password" }` (or use the dashboard login form, which calls `login()` in `auth.ts`). On success the API is written to return `{ "token": "<jwt>" }`, which the client stores and then attaches as `Authorization: Bearer <token>`. *Today:* the handler and the frontend `login()` are source-present but do not build, and the `AuthService` that issues the JWT is absent, so no token is actually issued. `Source: backend/internal/api/handlers/auth.go:L21-L39`, `Source: frontend/src/services/auth.ts:L4-L17`.

**Task 2 — Use your role (UA-001-2).** Access is governed by RBAC over `User.Role` (Admin, Manager, Operator, Auditor, API User). *Today:* `Role` is a plain unconstrained `string` and enforcement would live in the absent `middleware`, so no role check runs — RBAC is **Designed**. See the role/permission matrix in [`../security/security-model.md`](../security/security-model.md). `Source: backend/internal/db/schema.go:L27`.

**Task 3 — Complete MFA (UA-001-3).** A second factor (TOTP, SMS, or hardware key) would be required for dashboard access. *Today:* **Designed** — no MFA code exists. `Source: documentation/Software Requirements Specifications (SRS).md:L430`.

**Task 4 — Manage your session and log out (UA-001-4).** Sessions are intended to time out and support forced logout; `POST /auth/logout` is the server endpoint. *Today:* the frontend `logout()` is **local-only** (clears the stored token, never calls the server) and `isAuthenticated()` does **not** check token expiry, so session timeout and forced logout are **Designed**. `Source: frontend/src/services/auth.ts:L19-L43`.

**Task 5 — Set a compliant password (UA-001-5).** Choose a password of ≥12 characters mixing uppercase, lowercase, numbers, and a special character (for example `S3cret-Passphrase!`); the complexity rules, the five-password history window, and the 90-day maximum age are all specified in the Technical Specification (`Source: documentation/Technical Specifications.md:L474-L478`). The SRS contributes only the UA-001-5 requirement that a strong password policy be enforced; it states no length or character-class rule (`Source: documentation/Software Requirements Specifications (SRS).md:L432`). *Today:* **Designed** — no complexity validation, change, or history-reuse check runs in code.

**Task 6 (admin) — Review access logs (UA-001-6).** Administrators are intended to audit detailed access and action logs. *Today:* only Gin access logging is wired (and it cannot run because the package does not build); there is no persisted audit log — **Designed**. See [`../operations/observability.md`](../operations/observability.md) and the compliance boundary in [`../security/security-model.md`](../security/security-model.md). `Source: backend/internal/api/routes.go:L13-L14`.

**Onboarding & training.** New users and administrators should start with [`../getting-started/installation.md`](../getting-started/installation.md) and [`../getting-started/configuration.md`](../getting-started/configuration.md), then use the per-feature guides indexed in the frontend architecture [Documentation & Training Index](../architecture/frontend.md). The consolidated security posture is in [`../security/security-model.md`](../security/security-model.md).

## See Also

- [API reference overview](overview.md) — authentication model, bearer-token conventions, and the no-`/api/v1`-prefix path discussion.
- [Fig M1 — Data Model ERD](../architecture/data-model.md#fig-m1--data-model-erd) — the canonical `User` entity definition referenced by the register contract.
- [Scaffold vs. Design](../architecture/scaffold-vs-design.md) — the maturity matrix reconciling the design corpus with the on-disk scaffold.
