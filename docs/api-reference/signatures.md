# API Reference — Signatures

The **Signatures** resource covers custodial signing: a signature request is **coded to** ask the Utxo custodian to sign a payload for a specific vault's key, records are **written with** an initial `pending` status and are **intended to** be reconciled asynchronously by a background poller, and completed signatures are — **by design** — published to a Kafka stream for downstream consumers. This page documents the five signature endpoints as wired in the router — all grouped under `/signatures` and all bearer-protected. `Source: backend/internal/api/routes.go:L45-L51`. None of the five routes resolves to a defined handler method (see the honesty note below), so **every endpoint on this page is Designed**; nothing here runs today, because the backend has no `go.mod`, the `api` package imports the absent `middleware` package, and the signature path additionally depends on the absent `internal/custodian` and `pkg/utils` packages and on undefined `db.Repository` / `db.GetPendingSignatures` / `signature.StatusReady` / `signature.StatusFailed` symbols. `Source: backend/internal/core/signature/service.go:L24-L47`, `Source: backend/internal/tasks/signature_processor.go:L13-L60`, `Source: documentation/Software Requirements Specifications (SRS).md:L380`.

All five signature routes are registered under a single auth-protected group, `sig := router.Group("/signatures", middleware.AuthMiddleware())`, so every endpoint on this page is **declared** to require a valid JWT bearer token. Because the `middleware` package is imported but absent in the scaffold, that bearer **enforcement is Designed** — the wiring intent is present in source, but no token check runs and the package does not compile. `Source: backend/internal/api/routes.go:L45-L51`.

> **Honesty note (read first).** The router wires each signature route to a handler method (`CreateSignature`, `ListSignatures`, `GetSignature`, `UpdateSignature`, `DeleteSignature`), but the readable handler source defines **only** `GetRawSignature` and `CheckSignatureStatus` — none of the five referenced methods exist. Consequently every endpoint in this reference is labeled **Designed**: the routes are registered, but their handler methods are absent or name-mismatched. `Source: backend/internal/api/routes.go:L47-L51`, `Source: backend/internal/api/handlers/signature.go:L19-L55`. The closest **source-present** behavior — a signature **status check** backed by `CheckSignatureStatus` — is documented under [`GET /signatures/:id`](#get-signaturesid) as the *status-check variant*; note that this method is **not wired to any route** (the router references `GetSignature`, not `CheckSignatureStatus`) and does not compile — the handler passes a `string` path parameter to a service method that expects a `uuid.UUID`. `Source: backend/internal/api/handlers/signature.go:L42-L49`, `Source: backend/internal/core/signature/service.go:L55`.

## Maturity legend

Every capability and endpoint below is tagged with the project-wide maturity discipline, consistent with the design corpus and the [data model reference](../architecture/data-model.md#maturity-legend):

- **Implemented** — present in code, building, and functional today. Per the single operational-truth vocabulary in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md), this label is **reserved** and **nothing qualifies for it** at this checkpoint; it is not applied on this page.
- **Source-present (non-buildable)** — the handler method is written in source, but the containing package does not compile. No request/response behavior may be asserted as running. Equivalent to *Implemented-with-defects* on the architecture pages.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified by the router/design corpus but the handler method is absent or name-mismatched in the readable source.

> **Inferred contracts are Designed.** For every endpoint labeled **Designed** below, the request/response shapes, status codes, enumerations (including the `Ready` / `Failed` terminal states), and update/delete semantics are **inferred** from the design corpus (Technical Specification §API DESIGN) and the `Signature` entity model — they are **Designed**, not defined in code. `Source: documentation/Technical Specifications.md:§API DESIGN`.

## Base URL, versioning, and authentication

- **Base URL:** `http://localhost:8080` (used in the examples below) is **illustrative only**: no server bind address or port is configured in code, and the frontend Axios client defaults its base URL to `https://api.example.com` (overridable via `REACT_APP_API_BASE_URL`), not localhost. The router registers signature routes at the group root `/signatures` with **no `/api/v1` prefix**; the design corpus documents a `/api/v1/...` prefix as the **Designed** target. See the [API reference overview](overview.md) for the full path-fidelity discussion. `Source: backend/internal/api/routes.go:L45-L51`, `Source: frontend/src/services/api.ts:L4`.
- **Authentication:** Bearer JWT is **declared** on every endpoint. Obtain a token from `POST /auth/login` and send it as `Authorization: Bearer <token>`; the group's `AuthMiddleware()` is **intended** to enforce this, but because the `middleware` package is absent that enforcement is **Designed** (no token check runs). `Source: backend/internal/api/routes.go:L45`.
- **Path note:** the frontend Axios client fetches a signature via the singular `/signatures/:id` path, which agrees with the backend route group. `Source: frontend/src/services/api.ts:L44-L48`.

## Endpoint summary

| Method | Path | Handler referenced by router | Maturity |
|--------|------|------------------------------|----------|
| POST | `/signatures/create` | `SignatureHandler.CreateSignature` (absent) | **Designed** |
| GET | `/signatures/list` | `SignatureHandler.ListSignatures` (absent) | **Designed** |
| GET | `/signatures/:id` | `SignatureHandler.GetSignature` (absent); status-check variant is **Source-present (non-buildable)**, unwired | **Designed** |
| PUT | `/signatures/:id` | `SignatureHandler.UpdateSignature` (absent) | **Designed** |
| DELETE | `/signatures/:id` | `SignatureHandler.DeleteSignature` (absent) | **Designed** |

`Source: backend/internal/api/routes.go:L45-L51`, `Source: backend/internal/api/handlers/signature.go:L19-L55`.

## Signature lifecycle and asynchronous reconciliation

A signature is **coded to** move through the lifecycle **`pending → Ready | Failed`**, where only the initial `pending` literal is set by code and the `Ready` / `Failed` terminal states are **Designed** (see the status-vocabulary note below). `SignatureService.RequestSignature(userID, vaultID, dataToSign)` builds the record with the literal status `pending` and is coded to then call the custodian to begin signing. `Source: backend/internal/core/signature/service.go:L24-L47`. Two defects make this path non-buildable: the struct literal sets a `DataToSign` field that **does not exist** on the `Signature` model, and `internal/custodian` is imported but absent — so the custodian calls are **Designed**. `Source: backend/internal/db/schema.go:L58-L68`, `Source: backend/internal/core/signature/service.go:L6,L29,L38`.

Reconciliation is **designed to** be performed by the **`SignatureProcessor`**, a background worker coded to run on a **five-minute ticker** (`const signatureCheckInterval = 5 * time.Minute`). On each tick it is written to load pending signatures and call the signature service's status check for each, and then: `Source: backend/internal/tasks/signature_processor.go:L13,L33-L60`. This worker does not compile — it imports the absent `pkg/logger`, calls undefined `db.GetPendingSignatures` / `db.UpdateSignature` and undefined `signature.StatusReady` / `signature.StatusFailed`, and invokes `sigService.CheckSignatureStatus(ctx, sig.ID)` with two arguments while the service method accepts a single `uuid.UUID` — so the reconciliation described below is **Designed**. `Source: backend/internal/tasks/signature_processor.go:L10,L34,L40,L46-L56`, `Source: backend/internal/core/signature/service.go:L55`.

- **On `Ready`** — updates the signature in PostgreSQL and caches it to Redis with a **24-hour** TTL. `Source: backend/internal/tasks/signature_processor.go:L46-L54`.
- **On `Failed`** — updates the signature status in PostgreSQL. `Source: backend/internal/tasks/signature_processor.go:L55-L59`.

> **Status vocabulary.** `pending` is the concrete literal set by the service. `Source: backend/internal/core/signature/service.go:L30`. The terminal states `Ready` and `Failed` are referenced through the `signature.StatusReady` and `signature.StatusFailed` constants in the processor, but those constants are **not defined** in the readable signature package source, so their exact literal values are **Designed**. `Source: backend/internal/tasks/signature_processor.go:L46,L55`.

### Kafka publish for completed signatures (Designed)

Requirement **SG-001-4 "Publish Signature — Automatically publish completed signatures to Kafka stream"** specifies that, once a signature reaches its completed (`Ready`) state, a `signature.ready` event is published to a Kafka stream for downstream consumers. `Source: documentation/Software Requirements Specifications (SRS).md:L387`.

This publish step is **Designed**: there is **no Kafka client anywhere in the code**, and the processor's `Ready` branch performs only the PostgreSQL update and the 24-hour Redis cache write — it does not publish to Kafka. `Source: backend/internal/tasks/signature_processor.go:L46-L54`. The end-to-end path, including the designed Kafka fan-out, is illustrated in **Fig B3 — Signature Generation + Kafka Publish (Designed)** in the [data-flow documentation](../architecture/data-flow.md).

## POST `/signatures/create`

- **Maturity:** **Designed** — the router references `SignatureHandler.CreateSignature`, but the handler source defines only `GetRawSignature` and `CheckSignatureStatus`, so no `CreateSignature` method exists (handler/route name mismatch). `Source: backend/internal/api/routes.go:L47`, `Source: backend/internal/api/handlers/signature.go:L19-L55`.
- **Auth:** Bearer (JWT).
- **Description:** Requests a custodial signature over a payload for a vault's key. The intended behavior mirrors `SignatureService.RequestSignature(userID, vaultID, dataToSign)`: persist a new signature with status `pending`, then call the custodian to begin signing, returning `201 Created` with the new resource. `Source: backend/internal/core/signature/service.go:L24-L47`.
- **Parameters:** None (request body only).

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `vaultId` | string (uuid) | Yes | Vault whose key produces the signature. `Source: backend/internal/core/signature/service.go:L24`. |
| `dataToSign` | string (base64) | Yes | Payload bytes to be signed, base64-encoded. `Source: backend/internal/core/signature/service.go:L24,L29`. |

The acting `userID` is resolved server-side from the JWT, not supplied in the body. `Source: backend/internal/core/signature/service.go:L24`.

**Responses**

| Status | Meaning |
|--------|---------|
| `201 Created` | Signature request accepted; body is the new signature with `status: "pending"` (**Designed**). `Source: backend/internal/core/signature/service.go:L30-L46`. |
| `400 Bad Request` | Malformed request body (**Designed**). `Source: backend/internal/api/handlers/signature.go:L26-L29`. |
| `401 Unauthorized` | Missing or invalid bearer token. `Source: backend/internal/api/routes.go:L45`. |
| `500 Internal Server Error` | Custodian request or persistence failed (**Designed**). `Source: backend/internal/api/handlers/signature.go:L31-L35`. |

**Example request**

```bash
curl -X POST http://localhost:8080/signatures/create -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d '{"vaultId":"1b4e28ba-2fa1-11d2-883f-0016d3cca427","dataToSign":"SGVsbG8sIGJsb2NrY2hhaW4="}'
```

**Example response** (`201 Created`)

```json
{"id":"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d","userId":"7c9e6679-7425-40de-944b-e07fc1f90ae7","vaultId":"1b4e28ba-2fa1-11d2-883f-0016d3cca427","status":"pending","rawSignature":"","metadata":{}}
```

> **Serialization caveat (applies to every `Signature` response example on this page).** The lower-camelCase keys shown (`id`, `userId`, `vaultId`, `status`, `rawSignature`, `metadata`, `createdAt`, …) are the **Designed** response DTO. The `Signature` struct carries **no `json` tags** and embeds `gorm.Model`; were it to compile and marshal as-declared, the actual keys would be **PascalCase** (`ID`, `UserID`, `VaultID`, `Status`, `RawSignature`, `Metadata`, `CreatedAt`, `UpdatedAt`) plus a promoted `DeletedAt`. Note also that the service writes a `DataToSign` value that has **no corresponding field** on the model, so it would never appear in a response. See [Response Serialization](overview.md#response-serialization--designed-camelcase-contract-vs-actual-pascalcase-output). `Source: backend/internal/db/schema.go:L58-L68`, `Source: backend/internal/core/signature/service.go:L29`.

## GET `/signatures/list`

- **Maturity:** **Designed** — the router references `SignatureHandler.ListSignatures`, which is not defined in the handler source. `Source: backend/internal/api/routes.go:L48`, `Source: backend/internal/api/handlers/signature.go:L19-L55`.
- **Auth:** Bearer (JWT).
- **Description:** Lists the signatures visible to the caller. The intended response is a JSON array of signature objects. `Source: backend/internal/api/routes.go:L48`.
- **Parameters:** None.

**Responses**

| Status | Meaning |
|--------|---------|
| `200 OK` | JSON array of signatures (**Designed**). `Source: backend/internal/api/routes.go:L48`. |
| `401 Unauthorized` | Missing or invalid bearer token. `Source: backend/internal/api/routes.go:L45`. |

**Example request**

```bash
curl http://localhost:8080/signatures/list -H "Authorization: Bearer $JWT"
```

**Example response** (`200 OK`)

```json
[{"id":"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d","vaultId":"1b4e28ba-2fa1-11d2-883f-0016d3cca427","status":"Ready","rawSignature":"304402201f9f...c3a5","metadata":{}}]
```

## GET `/signatures/:id`

- **Maturity:** **Designed** for the full-resource fetch — the router references `SignatureHandler.GetSignature`, which is not defined. The closest **Source-present (non-buildable)** behavior is the *status-check variant* backed by `CheckSignatureStatus`, documented below — but that method is **not wired to this route** and does not compile. `Source: backend/internal/api/routes.go:L49`, `Source: backend/internal/api/handlers/signature.go:L42-L55`.
- **Auth:** Bearer (JWT).
- **Description (intended, Designed):** Retrieve a signature and all of its fields by UUID, mirroring `SignatureService.GetSignature(id)`. `Source: backend/internal/core/signature/service.go:L49-L51`.
- **Description (status-check variant, Source-present / non-buildable):** `SignatureHandler.CheckSignatureStatus` reads the `:id` path parameter and is written to return only the reconciled status via `SignatureService.CheckSignatureStatus(id)`, which compares the stored status against the custodian and persists any change. `Source: backend/internal/api/handlers/signature.go:L42-L55`, `Source: backend/internal/core/signature/service.go:L55-L75`. This variant is **not exposed by any route** (the router wires `GetSignature`, not `CheckSignatureStatus`) and does not compile — the handler passes the `string` from `c.Param("id")` to a service method that expects a `uuid.UUID`, and the custodian call is **Designed** (`internal/custodian` is imported but absent). `Source: backend/internal/api/routes.go:L49`, `Source: backend/internal/api/handlers/signature.go:L43,L49`, `Source: backend/internal/core/signature/service.go:L6,L55,L61`.

**Parameters**

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| `id` | path | string (uuid) | Yes | Signature identifier. `Source: backend/internal/api/handlers/signature.go:L43`. |

**Responses**

| Status | Meaning |
|--------|---------|
| `200 OK` (full resource) | The signature object (**Designed**). `Source: backend/internal/api/routes.go:L49`. |
| `200 OK` (status-check variant) | `{ "status": <string> }` from `CheckSignatureStatus` (**Source-present (non-buildable)**). `Source: backend/internal/api/handlers/signature.go:L49-L55`. |
| `400 Bad Request` | Missing signature ID (status-check variant). `Source: backend/internal/api/handlers/signature.go:L44-L47`. |
| `401 Unauthorized` | Missing or invalid bearer token. `Source: backend/internal/api/routes.go:L45`. |
| `404 Not Found` | Signature does not exist (full resource, **Designed**). `Source: backend/internal/api/routes.go:L49`. |
| `500 Internal Server Error` | Status reconciliation failed (status-check variant). `Source: backend/internal/api/handlers/signature.go:L50-L53`. |

**Example request**

```bash
curl http://localhost:8080/signatures/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d -H "Authorization: Bearer $JWT"
```

**Example response** — full resource (`200 OK`, **Designed**)

```json
{"id":"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d","vaultId":"1b4e28ba-2fa1-11d2-883f-0016d3cca427","status":"Ready","rawSignature":"304402201f9f...c3a5","metadata":{}}
```

**Example response** — status-check variant (`200 OK`, **Source-present (non-buildable)**). The only status literal written by code is `pending`; `Ready` / `Failed` are **Designed** terminal values (see the status-vocabulary note above).

```json
{"status":"pending"}
```

## PUT `/signatures/:id`

- **Maturity:** **Designed** — the router references `SignatureHandler.UpdateSignature`, which is not defined in the handler source. `Source: backend/internal/api/routes.go:L50`, `Source: backend/internal/api/handlers/signature.go:L19-L55`.
- **Auth:** Bearer (JWT).
- **Description:** Updates a signature's mutable attributes (for example, its status). Fields are inferred from the resource shape; the update handler is not present in code. `Source: backend/internal/api/routes.go:L50`.

**Parameters**

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| `id` | path | string (uuid) | Yes | Signature identifier. `Source: backend/internal/api/routes.go:L50`. |

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | New lifecycle status. The model types this as a plain, unconstrained `string`; the only literal written by code is `pending`, while `Ready` / `Failed` are **Designed** terminal values. `Source: backend/internal/db/schema.go:L63`, `Source: backend/internal/core/signature/service.go:L30`. |

**Responses**

| Status | Meaning |
|--------|---------|
| `200 OK` | The updated signature (**Designed**). `Source: backend/internal/api/routes.go:L50`. |
| `401 Unauthorized` | Missing or invalid bearer token. `Source: backend/internal/api/routes.go:L45`. |
| `404 Not Found` | Signature does not exist (**Designed**). `Source: backend/internal/api/routes.go:L50`. |

**Example request**

```bash
curl -X PUT http://localhost:8080/signatures/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d '{"status":"Ready"}'
```

**Example response** (`200 OK`)

```json
{"id":"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d","vaultId":"1b4e28ba-2fa1-11d2-883f-0016d3cca427","status":"Ready","rawSignature":"304402201f9f...c3a5"}
```

## DELETE `/signatures/:id`

- **Maturity:** **Designed** — the router references `SignatureHandler.DeleteSignature`, which is not defined in the handler source. `Source: backend/internal/api/routes.go:L51`, `Source: backend/internal/api/handlers/signature.go:L19-L55`.
- **Auth:** Bearer (JWT).
- **Description:** Deletes a signature by UUID. The intended response is an empty `204 No Content` (a `200 OK` with a confirmation message is an acceptable alternative shape); the delete handler is not present in code. `Source: backend/internal/api/routes.go:L51`.

**Parameters**

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| `id` | path | string (uuid) | Yes | Signature identifier. `Source: backend/internal/api/routes.go:L51`. |

**Responses**

| Status | Meaning |
|--------|---------|
| `204 No Content` | Signature deleted; no response body (**Designed**). `Source: backend/internal/api/routes.go:L51`. |
| `401 Unauthorized` | Missing or invalid bearer token. `Source: backend/internal/api/routes.go:L45`. |
| `404 Not Found` | Signature does not exist (**Designed**). `Source: backend/internal/api/routes.go:L51`. |

**Example request**

```bash
curl -X DELETE http://localhost:8080/signatures/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d -H "Authorization: Bearer $JWT"
```

**Example response** (`204 No Content`)

```text
HTTP/1.1 204 No Content
```

## Signature entity

Signature payloads on this page mirror the `Signature` GORM model. The canonical field definitions, relationships, and known gaps live in the data model reference — see **Fig M1 — Data Model ERD** at [`../architecture/data-model.md`](../architecture/data-model.md#fig-m1--data-model-erd). `Source: backend/internal/db/schema.go:L58-L68`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | Primary key. `Source: backend/internal/db/schema.go:L60`. |
| `userId` | uuid | User who requested the signature. `Source: backend/internal/db/schema.go:L61`. |
| `vaultId` | uuid | Vault whose key produces the signature. `Source: backend/internal/db/schema.go:L62`. |
| `status` | string | Lifecycle status, stored as a plain unconstrained `string`. Only `pending` is written by code; `Ready` / `Failed` are **Designed** terminal values. `Source: backend/internal/db/schema.go:L63`, `Source: backend/internal/core/signature/service.go:L30`. |
| `rawSignature` | string | Holds the raw signature material returned by the custodian. `Source: backend/internal/db/schema.go:L64`. |
| `metadata` | object | Free-form JSON attributes (`gorm.JSONMap`, persisted as JSONB). `Source: backend/internal/db/schema.go:L65`. |
| `createdAt` | date-time | Creation timestamp. `Source: backend/internal/db/schema.go:L66`. |
| `updatedAt` | date-time | Last-update timestamp. `Source: backend/internal/db/schema.go:L67`. |

## Related documentation

- [API reference overview](overview.md) — base URL, authentication, and the `/api/v1` path-prefix discrepancy.
- [OpenAPI specification](openapi.yaml) — machine-readable definitions for all signature operations and schemas.
- [Vaults API reference](vaults.md) — the vault resource that owns the signing key referenced by `vaultId`.
- [Data flow](../architecture/data-flow.md) — **Fig B3 — Signature Generation + Kafka Publish (Designed)** end-to-end sequence.
- [Data model reference](../architecture/data-model.md#fig-m1--data-model-erd) — **Fig M1 — Data Model ERD** and the `Signature` entity definition.
- [Scaffold vs. design reconciliation](../architecture/scaffold-vs-design.md) — the Implemented / Provisioned / Designed matrix that catalogs the signature handler/route mismatch and the designed Kafka publish.
