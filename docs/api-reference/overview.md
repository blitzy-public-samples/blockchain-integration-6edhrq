# API Reference — Overview

The backend of the Blockchain Integration Service is a Go/Gin HTTP service that exposes **18 REST endpoints** grouped into four resource collections — Authentication, Vaults, Transactions, and Signatures — registered on a single router behind global logging and recovery middleware. This reference documents that public HTTP contract **exactly as wired in code**, not as an aspirational target; a companion machine-readable [`openapi.yaml`](openapi.yaml) restates the same contract in OpenAPI 3.0 form. Every endpoint, path, and behavior described here traces to a cited source location, and every capability carries a maturity label so readers can distinguish what runs today from what is only specified. `Source: backend/internal/api/routes.go:L9-L54`.

## Maturity Legend

Every capability across the API reference is labeled with the project-wide maturity discipline, consistent with the sibling resource pages and the architecture documentation:

- **Implemented** — present and functional in the handler source as-declared today.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified (a route or intended contract), but the backing implementation is absent in code.

The consolidated maturity reconciliation between the design corpus and the on-disk scaffold — including the full catalog of known defects — is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Endpoint Index

The router registers the following 18 endpoints, grouped by resource. Paths are shown **exactly as they appear in code** — unprefixed and, for vaults, singular (`/vault`, not `/vaults`); see [Path Conventions and the Prefix/Pluralization Discrepancy](#path-conventions-and-the-prefixpluralization-discrepancy) for the reconciliation. The **Auth** column indicates whether the route attaches `AuthMiddleware()`; `Public` routes attach no middleware. **Maturity** reflects whether the referenced handler method is defined in code: only `Login`, `Logout`, `CreateVault`, and `CreateTransaction` are defined today, so those four routes are **Implemented** and the remaining fourteen are **Designed** (their routes are wired to handler methods that are not defined). `Source: backend/internal/api/routes.go:L17-L52`.

| Method | Path | Auth | Maturity | Reference |
|--------|------|------|----------|-----------|
| POST | `/auth/login` | Public | Implemented | [authentication.md](authentication.md) |
| POST | `/auth/register` | Public | Designed | [authentication.md](authentication.md) |
| POST | `/auth/logout` | Bearer | Implemented | [authentication.md](authentication.md) |
| POST | `/vault/create` | Bearer | Implemented | [vaults.md](vaults.md) |
| GET | `/vault/list` | Bearer | Designed | [vaults.md](vaults.md) |
| GET | `/vault/:id` | Bearer | Designed | [vaults.md](vaults.md) |
| PUT | `/vault/:id` | Bearer | Designed | [vaults.md](vaults.md) |
| DELETE | `/vault/:id` | Bearer | Designed | [vaults.md](vaults.md) |
| POST | `/transactions/create` | Bearer | Implemented | [transactions.md](transactions.md) |
| GET | `/transactions/list` | Bearer | Designed | [transactions.md](transactions.md) |
| GET | `/transactions/:id` | Bearer | Designed | [transactions.md](transactions.md) |
| PUT | `/transactions/:id` | Bearer | Designed | [transactions.md](transactions.md) |
| DELETE | `/transactions/:id` | Bearer | Designed | [transactions.md](transactions.md) |
| POST | `/signatures/create` | Bearer | Designed | [signatures.md](signatures.md) |
| GET | `/signatures/list` | Bearer | Designed | [signatures.md](signatures.md) |
| GET | `/signatures/:id` | Bearer | Designed | [signatures.md](signatures.md) |
| PUT | `/signatures/:id` | Bearer | Designed | [signatures.md](signatures.md) |
| DELETE | `/signatures/:id` | Bearer | Designed | [signatures.md](signatures.md) |

The three authentication routes are defined at `Source: backend/internal/api/routes.go:L19-L21`; the five vault routes at `Source: backend/internal/api/routes.go:L27-L31`; the five transaction routes at `Source: backend/internal/api/routes.go:L37-L41`; and the five signature routes at `Source: backend/internal/api/routes.go:L47-L51`. The counts by maturity are four **Implemented** and fourteen **Designed**, totaling the full 18-endpoint surface.

## Authentication Model

All routes except `POST /auth/login` and `POST /auth/register` are secured with JWT bearer authentication. A client first obtains a token by calling `POST /auth/login`, which validates the supplied credentials and returns a signed JWT in the response body as `{ "token": "<jwt>" }` (**Implemented**). `Source: backend/internal/api/handlers/auth.go:L21-L39`. The client then attaches that token to every subsequent request using the `Authorization` header, exactly as the frontend Axios client does in its request interceptor. `Source: frontend/src/services/api.ts:L11-L16`.

```http
Authorization: Bearer <jwt>
```

Enforcement on protected routes is delegated to `middleware.AuthMiddleware()`, which is attached to the vault, transaction, and signature route groups and to `POST /auth/logout`. `Source: backend/internal/api/routes.go:L25`. This guard is **Designed**: the `backend/internal/api/middleware` package is imported by the router but is not present in the repository, so the check is specified in the wiring yet cannot execute today. `Source: backend/internal/api/routes.go:L6`. Likewise, the `AuthService` that `Login` and `Logout` delegate to (`backend/internal/core/auth`) is imported but absent, so token issuance and revocation are **Designed** even though the two handler methods that call it are themselves **Implemented**. `Source: backend/internal/api/handlers/auth.go:L5`.

## Path Conventions and the Prefix/Pluralization Discrepancy

Three independent sources describe the API's paths and they do **not** agree. The backend router registers **unprefixed, action-suffixed** paths and uses the **singular** noun `/vault`; the frontend Axios client calls **plural** collection paths with no action suffix; and the design corpus (Technical Specification, §API DESIGN) documents a **versioned** `/api/v1/...` scheme with plural nouns. The table below compares all three for each affected resource.

| Resource | Backend (code, authoritative) | Frontend client | Tech Spec design |
|----------|-------------------------------|-----------------|------------------|
| Vaults | `/vault/create`, `/vault/list`, `/vault/:id` | `/vaults` | `/api/v1/vaults`, `/api/v1/vaults/{id}` |
| Transactions | `/transactions/create`, `/transactions/list`, `/transactions/:id` | `/transactions` | `/api/v1/transactions`, `/api/v1/transactions/{id}` |
| Signatures | `/signatures/create`, `/signatures/list`, `/signatures/:id` | `/signatures/:id` | `/api/v1/signatures`, `/api/v1/signatures/{id}` |

The backend paths are registered at `Source: backend/internal/api/routes.go:L25-L31` (the vault group is shown; the transaction and signature groups follow the same shape at L35-L41 and L45-L51). The frontend plural calls are at `Source: frontend/src/services/api.ts:L34,L40,L46`. The versioned plural design table is at `Source: documentation/Technical Specifications.md:§API DESIGN`.

**Resolution.** This API reference documents the **backend code paths as authoritative** — no `/api/v1` prefix, and the singular `/vault` noun — because the router is the contract that actually serves requests today. The frontend's plural paths and the Technical Specification's `/api/v1/...` scheme are recorded here as **divergences to be reconciled**; unifying them (whether by adding a version prefix and pluralizing the backend, or by correcting the frontend and the specification) is **Designed** work, not current behavior. The full catalog of this and the other scaffold-versus-design gaps is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## OpenAPI Specification and the `swag init` Workflow

A machine-readable OpenAPI 3.0 description of all 18 endpoints accompanies this reference at [`openapi.yaml`](openapi.yaml). It fulfills the Software Project Proposal's commitment to "Swagger docs for all endpoints" `Source: documentation/Software Project Proposal.md:L135,L388` and its target of 100% endpoint documentation coverage `Source: documentation/Software Project Proposal.md:L82`.

The intended generation workflow uses the swaggo toolchain, which parses `// @` annotation comments on the handlers and emits the specification, taking the composition root as its entry point:

```bash
go install github.com/swaggo/swag/cmd/swag@v1.16.6
swag init -g backend/cmd/server/main.go -o docs/api-reference --parseDependency --parseInternal
```

This workflow is **Designed**. No swaggo `// @` annotations exist on the handlers yet, and the backend is not a Go module (there is no `go.mod`), so `swag init` cannot run against the code as it stands; Go must also be installed in the environment when documentation is built. `Source: backend/cmd/server/main.go`. Until annotations are added, the `openapi.yaml` committed in this folder is **hand-authored** directly from the router, handlers, and database schema so that the machine-readable contract stays available and accurate in the interim.

## Request and Response Conventions

The following conventions hold across the resources unless a resource page notes an exception:

- **Request bodies** are JSON; handlers bind them with Gin's `ShouldBindJSON`, and a malformed or incomplete body yields `400` with an error envelope. `Source: backend/internal/api/handlers/auth.go:L27-L29`, `Source: backend/internal/api/handlers/transaction.go:L23-L25`.
- **Error responses** use a single-key envelope `{ "error": "<message>" }`. `Source: backend/internal/api/handlers/auth.go:L28,L34`, `Source: backend/internal/api/handlers/transaction.go:L24,L30`.
- **Simple success acknowledgements** use `{ "message": "<message>" }` — for example, the logout response. `Source: backend/internal/api/handlers/auth.go:L54`.
- **`id` path parameters** are UUID strings, read from the route via `c.Param("id")`. `Source: backend/internal/api/handlers/transaction.go:L38`.
- **Monetary `amount` values** are arbitrary-precision decimals serialized as JSON **strings** (for example `"10.5"`), backed by `decimal.Decimal`, to avoid floating-point rounding. `Source: backend/internal/db/schema.go:L52`.

### Entity Definitions

The request and response bodies on the resource pages reference a shared set of domain entities — Organization, User, Vault, Transaction, and Signature. Rather than redefining those fields on every page, all entity structures are defined once in [`../architecture/data-model.md`](../architecture/data-model.md) and depicted in **Fig M1 — Data Model ERD** ([open the figure](../architecture/data-model.md#fig-m1--data-model-erd)). Each resource page links back to that figure for the authoritative field definitions.

### Resource Pages

- [Authentication](authentication.md) — `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`.
- [Vaults](vaults.md) — `POST /vault/create`, `GET /vault/list`, and the `/vault/:id` read/update/delete trio.
- [Transactions](transactions.md) — `POST /transactions/create`, `GET /transactions/list`, and the `/transactions/:id` read/update/delete trio.
- [Signatures](signatures.md) — `POST /signatures/create`, `GET /signatures/list`, and the `/signatures/:id` read/update/delete trio.
- [`openapi.yaml`](openapi.yaml) — machine-readable OpenAPI 3.0 specification for all 18 endpoints.
