# API Reference — Authentication

The Authentication resource exposes three endpoints under the `/auth` route group: `POST /auth/login`, `POST /auth/register`, and `POST /auth/logout`. Login is **public** and issues a signed JWT that clients present as `Authorization: Bearer <token>` on every secured endpoint; logout is **auth-protected** by `AuthMiddleware()`; and register is **Designed** — its route is wired but no handler method is defined in code yet. `Source: backend/internal/api/routes.go:L17-L22`.

These paths are served at the router root and carry **no `/api/v1` prefix** — the design corpus documents a `/api/v1/...` target, but the code registers the bare `/auth/...` paths shown here. Path and versioning conventions are covered in the [API reference overview](overview.md). `Source: backend/internal/api/routes.go:L9-L22`.

## Maturity Legend

Every endpoint on this page is labeled with the project-wide maturity discipline:

- **Implemented** — present and functional in the handler source as-declared today.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified (a route or intended contract), but the backing implementation is absent in code.

The consolidated maturity reconciliation between the design corpus and the on-disk scaffold is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Endpoint Summary

| Endpoint | Auth | Maturity |
|----------|------|----------|
| `POST /auth/login` | Public | Implemented |
| `POST /auth/register` | Public | Designed |
| `POST /auth/logout` | Bearer | Implemented |

`Source: backend/internal/api/routes.go:L19-L21`.

## POST /auth/login

**Maturity:** Implemented. **Auth:** Public — no middleware is attached to this route. `Source: backend/internal/api/routes.go:L19`.

**Description.** Authenticates a user with a username and password and returns a signed JWT. The handler binds the JSON body into a struct whose `Username` and `Password` fields are both `binding:"required"`, delegates verification to `authService.Login(username, password)`, and returns the resulting token. The token is the bearer credential clients attach to all secured endpoints. `Source: backend/internal/api/handlers/auth.go:L21-L39`, `Source: frontend/src/services/api.ts:L11-L16`.

### Request

Headers: `Content-Type: application/json`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | `string` | Yes | Bound with `binding:"required"`; a missing or empty value yields `400`. `Source: backend/internal/api/handlers/auth.go:L23`. |
| `password` | `string` | Yes | Bound with `binding:"required"`; never logged or returned. `Source: backend/internal/api/handlers/auth.go:L24`. |

### Responses

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `{ "token": "<jwt>" }` | Authentication succeeded; the JWT is returned for use as a bearer token. `Source: backend/internal/api/handlers/auth.go:L38`. |
| `400 Bad Request` | `{ "error": "Invalid request payload" }` | The JSON body was missing, malformed, or omitted a required field. `Source: backend/internal/api/handlers/auth.go:L27-L29`. |
| `401 Unauthorized` | `{ "error": "Invalid credentials" }` | The username/password pair was rejected by the auth service. `Source: backend/internal/api/handlers/auth.go:L33-L35`. |

### Example

Request:

```bash
curl -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"s3cret-passphrase"}'
```

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
| `password` | `string` | Yes | Plaintext credential supplied at registration; stored only as a `PasswordHash` and never returned. `Source: backend/internal/db/schema.go:L26`. |
| `organizationId` | `string` (uuid) | Yes | The organization the user is created under. `Source: backend/internal/db/schema.go:L23`. |

### Responses (inferred)

| Status | Body | Meaning |
|--------|------|---------|
| `201 Created` | `User` record (without `PasswordHash`) | Intended success: the user was registered. **Designed** — not returned by any current handler. `Source: backend/internal/api/routes.go:L20`. |
| `400 Bad Request` | `{ "error": "Invalid request payload" }` | Intended validation failure for a missing or malformed body. **Designed**. `Source: backend/internal/api/routes.go:L20`. |

### Example (inferred)

Request:

```bash
curl -X POST http://localhost:8080/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com","password":"s3cret-passphrase","organizationId":"3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11"}'
```

Response (`201 Created`, Designed):

```json
{ "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "organizationId": "3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11",
  "username": "alice", "email": "alice@example.com", "role": "Operator" }
```

## POST /auth/logout

**Maturity:** Implemented. **Auth:** Bearer — the router attaches `middleware.AuthMiddleware()` to this route within the `/auth` group. `Source: backend/internal/api/routes.go:L21`.

**Description.** Invalidates the caller's session. The handler reads the authenticated `userID` from the Gin context (populated by the auth middleware), passes it to `authService.Logout(userID)`, and confirms success. The request takes **no body**; the caller is identified solely by the bearer token. `Source: backend/internal/api/handlers/auth.go:L41-L55`.

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

The authentication endpoints run on a partially-wired stack; the maturity of the surrounding pieces is called out here so the Implemented labels above are read in context.

- **Reused (Implemented).** The router installs Gin's built-in access logging and panic recovery via `gin.Logger()` and `gin.Recovery()`, which apply to all `/auth` routes. `Source: backend/internal/api/routes.go:L13-L14`.
- **Designed (imported but absent).** `middleware.AuthMiddleware()` — attached to `POST /auth/logout` and to every non-auth route group — and `internal/core/auth.AuthService`, which backs `AuthHandler.Login` and `AuthHandler.Logout`, are imported by the code but are **not present** in the repository. The `Login` and `Logout` handlers are Implemented as request/response code, but they depend on this Designed auth core to function at runtime. `Source: backend/internal/api/routes.go:L21,L25`, `Source: backend/internal/api/handlers/auth.go:L21-L55`.

The full Implemented / Provisioned / Designed reconciliation, including the router-signature and missing-package gaps, is documented in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## See Also

- [API reference overview](overview.md) — authentication model, bearer-token conventions, and the no-`/api/v1`-prefix path discussion.
- [Fig M1 — Data Model ERD](../architecture/data-model.md#fig-m1--data-model-erd) — the canonical `User` entity definition referenced by the register contract.
- [Scaffold vs. Design](../architecture/scaffold-vs-design.md) — the maturity matrix reconciling the design corpus with the on-disk scaffold.
