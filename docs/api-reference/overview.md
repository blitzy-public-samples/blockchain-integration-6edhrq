# API Reference — Overview

The backend of the Blockchain Integration Service is a Go/Gin HTTP service that exposes **18 REST endpoints** grouped into four resource collections — Authentication, Vaults, Transactions, and Signatures — registered on a single router behind global logging and recovery middleware. This reference documents that public HTTP contract **as declared in the router source**, not as an aspirational target; a companion machine-readable [`openapi.yaml`](openapi.yaml) restates the same contract in OpenAPI 3.0 form. Every endpoint, path, and behavior described here traces to a cited source location, and every capability carries a maturity label so readers can distinguish what is present in source from what is only specified. Note at the outset: the backend has **no `go.mod`** and the `api` package imports the absent `backend/internal/api/middleware` package, so the router does **not build today** — every route below is described by what its source is *written to* do, never by observed runtime behavior. `Source: backend/internal/api/routes.go:L1-L54`.

## Maturity Legend

Every capability across the API reference is labeled with the project-wide maturity discipline, consistent with the sibling resource pages and the architecture documentation:

- **Implemented** — present in code, building, and functional today. Per the single operational-truth vocabulary defined in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md), this label is **reserved**, and **nothing in this repository qualifies for it** at this checkpoint (there is no `go.mod`, and the `api` package imports the absent `middleware` package). It is therefore not applied to any route on this page.
- **Source-present (non-buildable)** — the handler method is written in source, but the containing package does not compile (no `go.mod`; absent imports; and, for the entity types, the undefined `gorm.JSONMap`), so no request/response behavior may be asserted as running. This is the operational-truth equivalent of *Implemented-with-defects* used on the architecture pages, applied here to the four routes whose handler methods are defined.
- **Designed** — specified (a route is registered, or an intended contract is described), but the backing implementation is absent in code — for example, a route wired to a handler method that does not exist.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.

The consolidated maturity reconciliation between the design corpus and the on-disk scaffold — including the full catalog of known defects — is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Endpoint Index

The router registers the following 18 endpoints, grouped by resource. Paths are shown **exactly as they appear in code** — unprefixed and, for vaults, singular (`/vault`, not `/vaults`); see [Path Conventions and the Prefix/Pluralization Discrepancy](#path-conventions-and-the-prefixpluralization-discrepancy) for the reconciliation. The **Auth** column indicates whether the route attaches `AuthMiddleware()`; `Public` routes attach no middleware. **Maturity** reflects whether the referenced handler method is defined in code: only `Login`, `Logout`, `CreateVault`, and `CreateTransaction` are defined, so those four routes are **Source-present (non-buildable)** and the remaining fourteen are **Designed** (their routes are wired to handler methods that are not defined). No route is **Implemented**: even for the four with a defined handler, the `api` package does not compile — it imports the absent `backend/internal/api/middleware` package, references handlers as method *expressions on the type* (for example `handlers.AuthHandler.Login`, not an instance method), and the backend has no `go.mod`. `Source: backend/internal/api/routes.go:L5-L52`.

| Method | Path | Auth | Maturity | Reference |
|--------|------|------|----------|-----------|
| POST | `/auth/login` | Public | Source-present (non-buildable) | [authentication.md](authentication.md) |
| POST | `/auth/register` | Public | Designed | [authentication.md](authentication.md) |
| POST | `/auth/logout` | Bearer | Source-present (non-buildable) | [authentication.md](authentication.md) |
| POST | `/vault/create` | Bearer | Source-present (non-buildable) | [vaults.md](vaults.md) |
| GET | `/vault/list` | Bearer | Designed | [vaults.md](vaults.md) |
| GET | `/vault/:id` | Bearer | Designed | [vaults.md](vaults.md) |
| PUT | `/vault/:id` | Bearer | Designed | [vaults.md](vaults.md) |
| DELETE | `/vault/:id` | Bearer | Designed | [vaults.md](vaults.md) |
| POST | `/transactions/create` | Bearer | Source-present (non-buildable) | [transactions.md](transactions.md) |
| GET | `/transactions/list` | Bearer | Designed | [transactions.md](transactions.md) |
| GET | `/transactions/:id` | Bearer | Designed | [transactions.md](transactions.md) |
| PUT | `/transactions/:id` | Bearer | Designed | [transactions.md](transactions.md) |
| DELETE | `/transactions/:id` | Bearer | Designed | [transactions.md](transactions.md) |
| POST | `/signatures/create` | Bearer | Designed | [signatures.md](signatures.md) |
| GET | `/signatures/list` | Bearer | Designed | [signatures.md](signatures.md) |
| GET | `/signatures/:id` | Bearer | Designed | [signatures.md](signatures.md) |
| PUT | `/signatures/:id` | Bearer | Designed | [signatures.md](signatures.md) |
| DELETE | `/signatures/:id` | Bearer | Designed | [signatures.md](signatures.md) |

The three authentication routes are defined at `Source: backend/internal/api/routes.go:L19-L21`; the five vault routes at `Source: backend/internal/api/routes.go:L27-L31`; the five transaction routes at `Source: backend/internal/api/routes.go:L37-L41`; and the five signature routes at `Source: backend/internal/api/routes.go:L47-L51`. The counts by maturity are four **Source-present (non-buildable)** and fourteen **Designed**, totaling the full 18-endpoint surface.

## Authentication Model

All routes except `POST /auth/login` and `POST /auth/register` are **declared** to be secured with JWT bearer authentication (enforcement is **Designed** — see below, because the guard package is absent). A client is intended to first obtain a token by calling `POST /auth/login`, whose handler is written to validate the supplied credentials and return a signed JWT in the response body as `{ "token": "<jwt>" }` (**Source-present, non-buildable** — the handler exists, but the `api` package and the `internal/core/auth` service it calls do not compile). `Source: backend/internal/api/handlers/auth.go:L21-L39`. The client is then coded to attach that token to every subsequent request using the `Authorization` header, exactly as the frontend Axios client does in its request interceptor. `Source: frontend/src/services/api.ts:L11-L16`.

```http
Authorization: Bearer <jwt>
```

Enforcement on protected routes is delegated to `middleware.AuthMiddleware()`, which is attached to the vault, transaction, and signature route groups and to `POST /auth/logout`. `Source: backend/internal/api/routes.go:L25`. This guard is **Designed**: the `backend/internal/api/middleware` package is imported by the router but is not present in the repository, so the check is specified in the wiring yet cannot execute today. `Source: backend/internal/api/routes.go:L6`. Likewise, the `AuthService` that `Login` and `Logout` delegate to (`backend/internal/core/auth`) is imported but absent, so token issuance and revocation are **Designed** even though the two handler methods that call it are themselves **source-present (non-buildable)**. `Source: backend/internal/api/handlers/auth.go:L5`.

## Path Conventions and the Prefix/Pluralization Discrepancy

Three independent sources describe the API's paths and they do **not** agree. The backend router registers **unprefixed, action-suffixed** paths and uses the **singular** noun `/vault`; the frontend Axios client calls **plural** collection paths with no action suffix; and the design corpus (Technical Specification, §API DESIGN) documents a **versioned** `/api/v1/...` scheme with plural nouns. The table below compares all three for each affected resource.

| Resource | Backend (code, authoritative) | Frontend client | Tech Spec design |
|----------|-------------------------------|-----------------|------------------|
| Vaults | `/vault/create`, `/vault/list`, `/vault/:id` | `/vaults` | `/api/v1/vaults`, `/api/v1/vaults/{id}` |
| Transactions | `/transactions/create`, `/transactions/list`, `/transactions/:id` | `/transactions` | `/api/v1/transactions`, `/api/v1/transactions/{id}` |
| Signatures | `/signatures/create`, `/signatures/list`, `/signatures/:id` | `/signatures/:id` | `/api/v1/signatures`, `/api/v1/signatures/{id}` |

The backend paths are registered at `Source: backend/internal/api/routes.go:L25-L31` (the vault group is shown; the transaction and signature groups follow the same shape at L35-L41 and L45-L51). The frontend plural calls are at `Source: frontend/src/services/api.ts:L34,L40,L46`. The versioned plural design table is at `Source: documentation/Technical Specifications.md:§API DESIGN`.

**Resolution.** This API reference documents the **backend code paths as authoritative** — no `/api/v1` prefix, and the singular `/vault` noun — because the router source is the contract the service is written to serve (no service runs today, as the `api` package does not build). The frontend's plural paths and the Technical Specification's `/api/v1/...` scheme are recorded here as **divergences to be reconciled**; unifying them (whether by adding a version prefix and pluralizing the backend, or by correcting the frontend and the specification) is **Designed** work, not current behavior. The full catalog of this and the other scaffold-versus-design gaps is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## OpenAPI Specification and the `swag init` Workflow

A machine-readable OpenAPI 3.0 description of all 18 endpoints accompanies this reference at [`openapi.yaml`](openapi.yaml). It fulfills the Software Project Proposal's commitment to "Swagger docs for all endpoints" `Source: documentation/Software Project Proposal.md:L135,L388` and its target of 100% endpoint documentation coverage `Source: documentation/Software Project Proposal.md:L82`.

The intended generation workflow uses the swaggo toolchain, which parses `// @` annotation comments on the handlers and emits a specification, taking the composition root as its entry point:

```bash
go install github.com/swaggo/swag/cmd/swag@v1.16.6
swag init -g backend/cmd/server/main.go -o docs/api-reference --parseDependency --parseInternal
```

**Version metadata caveat.** The command above pins the module version `@v1.16.6`, but the installed binary self-reports a **different** version: `swag --version` prints `swag version v1.16.4`. This is an upstream release-metadata defect rather than a mis-resolved install — the `v1.16.6` tag ships a hard-coded version constant that was never bumped, and the CLI surfaces that constant verbatim as its reported version. `Source: github.com/swaggo/swag@v1.16.6/version.go:L4, github.com/swaggo/swag@v1.16.6/cmd/swag/main.go:L282`. Pin and verify the toolchain by **module version** — the `@v1.16.6` argument, recorded in `go.sum` once a module exists — and never by the binary's `--version` output, which cannot distinguish v1.16.4 from v1.16.6.

**Important format caveat.** `swag` (v1.16.x, the current stable v1 line) emits **Swagger 2.0 (OpenAPI 2.0)** — `swagger.json` / `swagger.yaml` — **not** OpenAPI 3.0. `Source: https://github.com/swaggo/swag`. The `openapi.yaml` committed in this folder is an **OpenAPI 3.0** document, so it cannot be produced by `swag init` alone: a conversion step (for example `swagger2openapi`, or an equivalent 2.0→3.0 converter) would be required after generation, or the spec must be authored/maintained directly as OAS 3.0.

This workflow is **Designed**. No swaggo `// @` annotations exist on the handlers yet, and the backend is not a Go module (there is no `go.mod`), so `swag init` cannot run against the code as it stands; Go must also be installed in the environment when documentation is built. `Source: backend/cmd/server/main.go`. Because of both the absent module and the 2.0-vs-3.0 format gap above, the `openapi.yaml` committed in this folder is **hand-authored** directly as OpenAPI 3.0 from the router, handlers, and database schema so that the machine-readable contract stays available and accurate in the interim.

**Specification validation and accepted warnings.** Because the specification is hand-authored rather than generated, it is validated directly against the OpenAPI 3.0 schema. The committed document is **Implemented** — present, parseable, and schema-valid as OpenAPI 3.0.3 with zero errors across its 12 paths and 18 operations:

```bash
npx @redocly/cli@1.25.11 lint docs/api-reference/openapi.yaml   # exit 0: valid, 0 errors, 2 accepted warnings
```

That lint reports two warnings under the tool's built-in recommended ruleset. Both are **deliberately accepted** consequences of documenting a scaffold honestly, not specification defects, and neither affects OpenAPI 3.0 validity:

| Rule | Location | Warning | Why it is accepted |
|------|----------|---------|--------------------|
| `no-server-example.com` | `openapi.yaml:82:10` | Server `url` should not point to example.com or localhost. | The only base URL that can honestly be published is illustrative. No `/api/v1` prefix exists in code, and the bind address is read from the **absent** `internal/config` package, so no resolvable host exists to cite; the `servers` entry states this inline rather than implying a deployed endpoint. `Source: docs/api-reference/openapi.yaml:L81-L92, backend/cmd/server/main.go:L59-L60` |
| `no-unused-components` | `openapi.yaml:971:5` | Component: "Organization" is never used. | `Organization` is one of the five persisted entities, but **no route exposes an organization resource** — the router declares zero organization endpoints — so the schema is intentionally defined without any `$ref`. It is retained to carry the tenant entity's documented shape and its `apiKey` exposure disclosure. `Source: backend/internal/db/schema.go:L11, backend/internal/api/routes.go:L9-L54` |

Enforcing this validation automatically is **Designed**: neither continuous-integration workflow validates the specification today, so the check is a manual documentation-build step. `Source: .github/workflows/backend-ci.yml, .github/workflows/frontend-ci.yml (no specification lint step present)`.

## Request and Response Conventions

The following conventions hold across the resources unless a resource page notes an exception:

- **Request bodies** are JSON; handlers bind them with Gin's `ShouldBindJSON`, and a malformed or incomplete body yields `400` with an error envelope. `Source: backend/internal/api/handlers/auth.go:L27-L29`, `Source: backend/internal/api/handlers/transaction.go:L23-L25`.
- **Error responses** use a single-key envelope `{ "error": "<message>" }`. `Source: backend/internal/api/handlers/auth.go:L28,L34`, `Source: backend/internal/api/handlers/transaction.go:L24,L30`.
- **Simple success acknowledgements** use `{ "message": "<message>" }` — for example, the logout response. `Source: backend/internal/api/handlers/auth.go:L54`.
- **`id` path parameters** are UUID strings, read from the route via `c.Param("id")`. `Source: backend/internal/api/handlers/transaction.go:L38`.
- **Monetary `amount` values** are intended to be arbitrary-precision decimals serialized as JSON **strings** (for example `"10.5"`), backed by `decimal.Decimal`, to avoid floating-point rounding. `Source: backend/internal/db/schema.go:L52`.

### Response Serialization — Designed camelCase contract vs. actual PascalCase output

The request and response examples on the resource pages, and the schemas in [`openapi.yaml`](openapi.yaml), use **lower-camelCase** field names (`id`, `createdAt`, `organizationId`, `blockchainType`, `txHash`, `rawSignature`, …). **That camelCase shape is the Designed API contract** — the intended wire format once a response DTO layer or `json` struct tags are introduced. It is *not* what the current code would emit.

As the domain types stand in source today, they carry **no `json` struct tags** and each embeds `gorm.Model`. `Source: backend/internal/db/schema.go:L11-L68`. The entity-returning handlers marshal these structs directly — for example `c.JSON(201, createdVault)` and `c.JSON(200, vaults)` — with no DTO in between. `Source: backend/internal/api/handlers/vault.go:L56,L32`. Consequently, **were these types to compile and be marshaled by Go's `encoding/json` as-declared, the wire output would be PascalCase**, not camelCase:

- Field keys would be the Go field names verbatim — `ID`, `Name`, `APIKey`, `OrganizationID`, `BlockchainType`, `TxHash`, `RawSignature`, `CreatedAt`, `UpdatedAt` — because there are no `json` tags to lower-case them.
- The outer `ID uuid.UUID` shadows the embedded `gorm.Model.ID uint` (a shallower field wins in `encoding/json`), so `ID` serializes as the UUID; but the embedded `DeletedAt` is **not** shadowed, so it is **promoted and serialized** as an extra `DeletedAt` key (rendering as `null` for a live record, via `gorm.DeletedAt`'s `MarshalJSON`). `Source: backend/internal/db/schema.go:L12-L17`.
- For `User`, `PasswordHash` has **no `json:"-"` tag**, so it would be **exposed in responses** — the security risk documented as a *"Security defect (documented, not fixed)"* under [Secrets and Key Management](../security/security-model.md#secrets-and-key-management) in the security model. `Source: backend/internal/db/schema.go:L26`.

This entire path is **Source-present (non-buildable)** in any case: `schema.go` does not compile because `Metadata gorm.JSONMap` is an undefined type (see [`../architecture/data-model.md`](../architecture/data-model.md#gap-notes)), so **no response is actually serialized today**. The reconciliation — adding `json` tags or a dedicated response DTO so the emitted contract matches the camelCase examples, and adding the `PasswordHash` exclusion — is **Designed** work. Each resource page repeats this note in brief and its `openapi.yaml` schemas are annotated accordingly. `Source: backend/internal/db/schema.go:L39,L53,L65`.

### Entity Definitions

The request and response bodies on the resource pages reference a shared set of domain entities — Organization, User, Vault, Transaction, and Signature. Rather than redefining those fields on every page, all entity structures are defined once in [`../architecture/data-model.md`](../architecture/data-model.md) and depicted in **Fig M1 — Data Model ERD** ([open the figure](../architecture/data-model.md#fig-m1--data-model-erd)). Each resource page links back to that figure for the authoritative field definitions.

### Resource Pages

- [Authentication](authentication.md) — `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`.
- [Vaults](vaults.md) — `POST /vault/create`, `GET /vault/list`, and the `/vault/:id` read/update/delete trio.
- [Transactions](transactions.md) — `POST /transactions/create`, `GET /transactions/list`, and the `/transactions/:id` read/update/delete trio.
- [Signatures](signatures.md) — `POST /signatures/create`, `GET /signatures/list`, and the `/signatures/:id` read/update/delete trio.
- [`openapi.yaml`](openapi.yaml) — machine-readable OpenAPI 3.0 specification for all 18 endpoints.
