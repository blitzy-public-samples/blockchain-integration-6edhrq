# API Reference — Vaults

A **vault** is an organization-scoped custodial blockchain wallet abstraction: it holds an on-chain address for a specific chain and is owned by exactly one organization. This page documents the five vault CRUD endpoints as wired in the router — all grouped under `/vault` and all bearer-protected. `Source: backend/internal/api/routes.go:L25-L31`. Only vault creation has a defined handler method (`CreateVault`), so `POST /vault/create` is **Source-present (non-buildable)**; the other four routes are registered but their handler methods are not defined in the scaffold and are therefore **Designed**. Nothing on this page runs today: the backend has no `go.mod`, the `api` package imports the absent `middleware` package, and the vault create path additionally depends on the absent `internal/blockchain` and `pkg/utils` packages. `Source: backend/internal/api/handlers/vault.go:L19-L57`.

The machine-readable contract for these endpoints lives in [`openapi.yaml`](openapi.yaml); the canonical Vault entity definition lives in [`../architecture/data-model.md`](../architecture/data-model.md#fig-m1--data-model-erd) (see **Fig M1 — Data Model ERD**). Example values on this page are reused from the OpenAPI specification so both documents stay in sync.

## Maturity Legend

Every endpoint below is labeled with the project-wide maturity discipline:

- **Implemented** — present in code, building, and functional today. Per the single operational-truth vocabulary in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md), this label is **reserved** and **nothing qualifies for it** at this checkpoint; it is not applied on this page.
- **Source-present (non-buildable)** — the handler method is written in source, but the containing package does not compile. No request/response behavior may be asserted as running. Equivalent to *Implemented-with-defects* on the architecture pages.
- **Designed** — the route is registered (or the behavior is specified in the design corpus), but the backing handler method is not defined in the readable handler source.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.

> **Inferred contracts are Designed.** For every endpoint labeled **Designed** below (`GET /vault/list`, `GET /vault/:id`, `PUT /vault/:id`, `DELETE /vault/:id`), the request/response shapes, status codes, enumerations, and update/delete semantics are **inferred** from the design corpus (Technical Specification §API DESIGN) and the `Vault` entity model — they are **Designed**, not defined in code. The `Source` citations on those rows point to the route registration (proving the route exists) or the entity, not to a handler that returns the documented shape. `Source: documentation/Technical Specifications.md:§API DESIGN`.

The consolidated Implemented / Provisioned / Designed matrix that reconciles the design corpus with the on-disk scaffold is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Authentication and base URL

All vault routes are registered under the group `router.Group("/vault", middleware.AuthMiddleware())`, so each route is **declared** to require a JWT bearer token in the `Authorization: Bearer <token>` header; a token would be obtained from `POST /auth/login`. `Source: backend/internal/api/routes.go:L25`. The `middleware` package is imported but absent in the current scaffold, so bearer **enforcement is Designed** — the wiring intent is present in source, but no token check runs (and the package does not compile). The frontend Axios client is coded to attach the same bearer header via a request interceptor. `Source: frontend/src/services/api.ts:L11-L16`.

Vaults are multi-tenant: the owning organization is never supplied in the request body — it is resolved server-side from the authenticated context via `utils.GetOrganizationIDFromContext`. `Source: backend/internal/api/handlers/vault.go:L20,L44`. That helper comes from `pkg/utils`, which is imported but absent, so organization resolution is **Designed**.

The router registers routes at the root with **no version prefix**. The base URL `http://localhost:8080` used in the examples below is **illustrative only**: no server bind address or port is configured anywhere in code, and the frontend Axios client actually defaults its base URL to `https://api.example.com` (overridable via `REACT_APP_API_BASE_URL`), not localhost. `Source: backend/internal/api/routes.go:L9-L14`, `Source: frontend/src/services/api.ts:L4`.

## Path Note: `/vault` vs `/vaults` vs `/api/v1/vaults`

The vault resource is addressed by three **different** path conventions across the repository. This page documents the **backend router paths as authoritative** because they are the paths registered in the router source — the contract the service is written to serve (no service runs today, as the package does not build). The divergence is intentional to document — it is never silently reconciled.

| Convention | Path shape | Status | Source |
|------------|-----------|--------|--------|
| **Backend router (authoritative)** | singular, unprefixed — `/vault/create`, `/vault/list`, `/vault/:id` | Source-present (paths registered) | `Source: backend/internal/api/routes.go:L25-L31` |
| Frontend Axios client | plural — `GET /vaults` | Divergent | `Source: frontend/src/services/api.ts:L34` |
| Technical Specification (design) | prefixed + plural — `/api/v1/vaults`, `/api/v1/vaults/{id}` | Designed | `Source: documentation/Technical Specifications.md:§API DESIGN` |

The frontend's plural `/vaults` call will not match the backend's singular `/vault/list` route, and the `/api/v1` prefix documented in the design corpus does not exist in code. The full reconciliation of this and other design-versus-scaffold gaps is tracked in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md); a per-resource summary is also given in the [API reference overview](overview.md).

## POST /vault/create

**Maturity:** Source-present (non-buildable) — `Source: backend/internal/api/handlers/vault.go:L37-L57`.
**Auth:** Bearer (required).

**Description.** The handler is written to create a custodial vault for the caller's organization: it binds the JSON body to `vault.CreateVaultRequest`, resolves the organization ID from the authenticated context, calls `VaultService.CreateVault`, and returns the created vault with `201`. `Source: backend/internal/api/handlers/vault.go:L37-L57`. The service provisions the vault's on-chain address by calling `blockchainClient.GenerateAddress(blockchainType)` before persisting. `Source: backend/internal/core/vault/service.go:L24-L44,L25`. Because the `internal/blockchain` package is imported but absent, **address generation is Designed** — the create path itself does not compile in the scaffold today. Note a handler/service signature mismatch: the handler passes two arguments `(orgID, createVaultRequest)`, while the service signature takes three scalar arguments `(organizationID, name, blockchainType)` — the request body below is inferred from the service signature. Together with the absent `internal/blockchain` import and the backend's missing `go.mod`, nothing in the create path builds. `Source: backend/internal/api/handlers/vault.go:L50`, `Source: backend/internal/core/vault/service.go:L24`.

**Path/query parameters.** None.

**Request body.** `CreateVaultRequest`. The `organizationID` is **not** part of the body; it is derived from the JWT. Fields are inferred from the service constructor `VaultService.CreateVault(organizationID, name, blockchainType)`. `Source: backend/internal/core/vault/service.go:L24`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Vault display name. |
| `blockchainType` | string | Yes | Target chain. In code the field is a plain, unconstrained `string` (`Source: backend/internal/db/schema.go:L37`); the `XRP` / `Ethereum` enumeration is **Designed** (specified in the design corpus, not enforced by the schema). `Source: documentation/Technical Specifications.md:§API DESIGN`. |

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `201 Created` | `Vault` | Vault created and returned. `Source: backend/internal/api/handlers/vault.go:L56`. |
| `400 Bad Request` | `{ "error": "Invalid request body" }` | Body failed JSON binding. `Source: backend/internal/api/handlers/vault.go:L39-L41`. |
| `400 Bad Request` | `{ "error": "Invalid organization ID" }` | Organization could not be resolved from context. `Source: backend/internal/api/handlers/vault.go:L44-L48`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (emitted by the Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L25`. |
| `500 Internal Server Error` | `{ "error": "Failed to create vault" }` | Service or persistence failure. `Source: backend/internal/api/handlers/vault.go:L51-L53`. |

**Request example.**

```bash
curl -X POST http://localhost:8080/vault/create -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"name":"Treasury Vault","blockchainType":"XRP"}'
```

**Response example** (`201 Created`).

```json
{ "id": "1b4e28ba-2fa1-11d2-883f-0016d3cca427", "organizationId": "3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11",
  "name": "Treasury Vault", "blockchainType": "XRP", "address": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "metadata": {}, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:30:00Z" }
```

> **Serialization caveat (applies to every `Vault` response example on this page).** The lower-camelCase keys above (`id`, `organizationId`, `blockchainType`, `createdAt`, …) are the **Designed** response DTO. The `Vault` struct carries **no `json` tags** and embeds `gorm.Model`, and the `CreateVault` handler marshals it directly (`c.JSON(201, createdVault)`); were it to compile and marshal as-declared, the actual keys would be **PascalCase** (`ID`, `OrganizationID`, `Name`, `BlockchainType`, `Address`, `Metadata`, `CreatedAt`, `UpdatedAt`) plus a promoted `DeletedAt`. See [Response Serialization](overview.md#response-serialization--designed-camelcase-contract-vs-actual-pascalcase-output). `Source: backend/internal/db/schema.go:L32-L42`, `Source: backend/internal/api/handlers/vault.go:L56`.

## GET /vault/list

**Maturity:** Designed — handler/route name mismatch (see below).
**Auth:** Bearer (required).

**Description.** Lists all vaults scoped to the caller's organization. The router binds this route to `VaultHandler.ListVaults`, but the handler source defines `GetAllVaults` (not `ListVaults`), so the route does not resolve to a defined method as written — the endpoint is therefore **Designed**. `Source: backend/internal/api/routes.go:L28`, `Source: backend/internal/api/handlers/vault.go:L19-L33`. The source-present `GetAllVaults` method is written to resolve the organization ID from context and return `200` with an array of vaults, and is the intended behavior once the name mismatch is corrected (it does not run today — the `api` package does not compile). `Source: backend/internal/api/handlers/vault.go:L19-L33`.

**Path/query parameters.** None.

**Request body.** None.

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `Vault[]` | Array of vaults for the organization. `Source: backend/internal/api/handlers/vault.go:L32`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L25`. |

**Request example.**

```bash
curl http://localhost:8080/vault/list -H "Authorization: Bearer <token>"
```

**Response example** (`200 OK`).

```json
[ { "id": "1b4e28ba-2fa1-11d2-883f-0016d3cca427", "organizationId": "3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11",
    "name": "Treasury Vault", "blockchainType": "XRP", "address": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    "metadata": {}, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:30:00Z" } ]
```

## GET /vault/:id

**Maturity:** Designed — the route is registered but its handler method is not defined in the readable handler source. `Source: backend/internal/api/routes.go:L29`.
**Auth:** Bearer (required).

**Description.** Retrieves a single vault by its UUID. The route maps to `VaultHandler.GetVault`, which is not present in the handler source, so the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L29`. The intended behavior is backed by `VaultService.GetVault(vaultID)`, which loads one vault by ID from the repository. `Source: backend/internal/core/vault/service.go:L46-L48`.

**Path/query parameters.**

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `id` | path | string (UUID) | Yes | Vault identifier. Gin `:id` path parameter. `Source: backend/internal/api/routes.go:L29`. |

**Request body.** None.

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `Vault` | The requested vault. `Source: backend/internal/core/vault/service.go:L46-L48`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L25`. |
| `404 Not Found` | `{ "error": "Vault not found" }` | No vault with the given ID for the organization. `Source: backend/internal/api/routes.go:L29`. |

**Request example.**

```bash
curl http://localhost:8080/vault/1b4e28ba-2fa1-11d2-883f-0016d3cca427 \
  -H "Authorization: Bearer <token>"
```

**Response example** (`200 OK`).

```json
{ "id": "1b4e28ba-2fa1-11d2-883f-0016d3cca427", "organizationId": "3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11",
  "name": "Treasury Vault", "blockchainType": "XRP", "address": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "metadata": {}, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:30:00Z" }
```

## PUT /vault/:id

**Maturity:** Designed — the route is registered but its handler method is not defined in the readable handler source. `Source: backend/internal/api/routes.go:L30`.
**Auth:** Bearer (required).

**Description.** Updates a vault's mutable attributes. The route maps to `VaultHandler.UpdateVault`, which is not present in the handler source, so the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L30`. Immutable identity fields (`id`, `organizationId`, `blockchainType`, `address`) are not updatable; only presentational fields are intended to change.

**Path/query parameters.**

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `id` | path | string (UUID) | Yes | Vault identifier. Gin `:id` path parameter. `Source: backend/internal/api/routes.go:L30`. |

**Request body.** `UpdateVaultRequest` (inferred; **Designed**). All fields optional.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | No | New display name. |
| `metadata` | object | No | Free-form JSON metadata (`gorm.JSONMap`). `Source: backend/internal/db/schema.go:L39`. |

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `Vault` | The updated vault. `Source: backend/internal/api/routes.go:L30`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L25`. |
| `404 Not Found` | `{ "error": "Vault not found" }` | No vault with the given ID for the organization. `Source: backend/internal/api/routes.go:L30`. |

**Request example.**

```bash
curl -X PUT http://localhost:8080/vault/1b4e28ba-2fa1-11d2-883f-0016d3cca427 \
  -H "Authorization: Bearer <token>" -d '{"name":"Treasury Vault (renamed)","metadata":{"tier":"cold"}}'
```

**Response example** (`200 OK`).

```json
{ "id": "1b4e28ba-2fa1-11d2-883f-0016d3cca427", "organizationId": "3f1a5b2c-9d84-4c1e-8a7b-2b6d5e4f0a11",
  "name": "Treasury Vault (renamed)", "blockchainType": "XRP", "address": "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  "metadata": { "tier": "cold" }, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-16T11:00:00Z" }
```

## DELETE /vault/:id

**Maturity:** Designed — the route is registered but its handler method is not defined in the readable handler source. `Source: backend/internal/api/routes.go:L31`.
**Auth:** Bearer (required).

**Description.** Deletes a vault by its UUID. The route maps to `VaultHandler.DeleteVault`, which is not present in the handler source, so the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L31`. On success the intended response carries no body (`204 No Content`); a `200 OK` acknowledgement envelope is an acceptable alternative in the target design.

**Path/query parameters.**

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `id` | path | string (UUID) | Yes | Vault identifier. Gin `:id` path parameter. `Source: backend/internal/api/routes.go:L31`. |

**Request body.** None.

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `204 No Content` | (empty) | Vault deleted. `Source: backend/internal/api/routes.go:L31`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L25`. |
| `404 Not Found` | `{ "error": "Vault not found" }` | No vault with the given ID for the organization. `Source: backend/internal/api/routes.go:L31`. |

**Request example.**

```bash
curl -X DELETE http://localhost:8080/vault/1b4e28ba-2fa1-11d2-883f-0016d3cca427 \
  -H "Authorization: Bearer <token>"
```

**Response example** (`204 No Content`).

```http
HTTP/1.1 204 No Content
```

## Vault entity

The vault resource is the `Vault` GORM model. Its fields are not re-defined exhaustively here — the canonical definition, including the dual-identifier gap note, is maintained in [`../architecture/data-model.md`](../architecture/data-model.md#fig-m1--data-model-erd) under **Fig M1 — Data Model ERD**. `Source: backend/internal/db/schema.go:L32-L42`.

Key points for API consumers:

- `blockchainType` is a plain `string` in code; the enumerated chains `XRP` / `Ethereum` are **Designed** (not enforced by the schema). `Source: backend/internal/db/schema.go:L37`, `Source: documentation/Technical Specifications.md:§API DESIGN`.
- `metadata` is a free-form JSON object persisted as JSONB via `gorm.JSONMap`. `Source: backend/internal/db/schema.go:L39`.
- `address` is the on-chain address held by the custodial vault; it is populated by the (Designed) blockchain adapter at create time rather than supplied by the client. `Source: backend/internal/core/vault/service.go:L25`, `Source: backend/internal/db/schema.go:L38`.
- A vault owns transactions: each `Transaction` references its source vault via `VaultID`. `Source: backend/internal/db/schema.go:L48`.

## Related documentation

- [API reference overview](overview.md) — resource map, maturity discipline, and the `swag` generation workflow.
- [OpenAPI specification](openapi.yaml) — the machine-readable contract for all vault operations.
- [Transactions API reference](transactions.md) — the transaction resource that vaults own.
- [Data Model Reference — Fig M1](../architecture/data-model.md#fig-m1--data-model-erd) — canonical Vault entity and relationships.
- [Scaffold vs. Design reconciliation](../architecture/scaffold-vs-design.md) — the full Implemented / Provisioned / Designed matrix behind the maturity labels above.
