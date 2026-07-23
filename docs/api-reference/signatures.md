# API Reference — Signatures

The **Signatures** resource covers custodial signing: a signature request asks the Utxo custodian to sign a payload for a specific vault's key, requests are created in a `pending` state and reconciled asynchronously by a background poller, and completed signatures are — **by design** — published to a Kafka stream for downstream consumers. `Source: backend/internal/core/signature/service.go:L24-L47`, `Source: backend/internal/tasks/signature_processor.go:L13-L54`, `Source: documentation/Software Requirements Specifications (SRS).md:L380`.

All five signature routes are registered under a single auth-protected group, `sig := router.Group("/signatures", middleware.AuthMiddleware())`, so every endpoint on this page requires a valid JWT bearer token. `Source: backend/internal/api/routes.go:L45-L51`.

> **Honesty note (read first).** The router wires each signature route to a handler method (`CreateSignature`, `ListSignatures`, `GetSignature`, `UpdateSignature`, `DeleteSignature`), but the readable handler source defines **only** `GetRawSignature` and `CheckSignatureStatus` — none of the five referenced methods exist. Consequently every endpoint in this reference is labeled **Designed**: the routes are registered, but their handler methods are absent or name-mismatched. `Source: backend/internal/api/routes.go:L47-L51`, `Source: backend/internal/api/handlers/signature.go:L19-L55`. The one implemented behavior — a signature **status check** — is documented under [`GET /signatures/:id`](#get-signaturesid) as the *implemented status-check variant*.

## Maturity legend

Every capability and endpoint below is tagged with the project-wide maturity discipline, consistent with the design corpus and the [data model reference](../architecture/data-model.md#maturity-legend):

- **Implemented** — present and functional in the code as-declared today.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified by the router/design corpus but the handler method is absent or name-mismatched in the readable source.

## Base URL, versioning, and authentication

- **Base URL:** `http://localhost:8080` (local development default; no version prefix). The router registers signature routes at the group root `/signatures` with **no `/api/v1` prefix**; the design corpus documents a `/api/v1/...` prefix as the **Designed** target. See the [API reference overview](overview.md) for the full path-fidelity discussion. `Source: backend/internal/api/routes.go:L45-L51`.
- **Authentication:** Bearer JWT on every endpoint. Obtain a token from `POST /auth/login` and send it as `Authorization: Bearer <token>`; the group's `AuthMiddleware()` enforces this. `Source: backend/internal/api/routes.go:L45`.
- **Path note:** the frontend Axios client fetches a signature via the singular `/signatures/:id` path, which agrees with the backend route group. `Source: frontend/src/services/api.ts:L44-L48`.

## Endpoint summary

| Method | Path | Handler referenced by router | Maturity |
|--------|------|------------------------------|----------|
| POST | `/signatures/create` | `SignatureHandler.CreateSignature` (absent) | **Designed** |
| GET | `/signatures/list` | `SignatureHandler.ListSignatures` (absent) | **Designed** |
| GET | `/signatures/:id` | `SignatureHandler.GetSignature` (absent); status-check variant **Implemented** | **Designed** |
| PUT | `/signatures/:id` | `SignatureHandler.UpdateSignature` (absent) | **Designed** |
| DELETE | `/signatures/:id` | `SignatureHandler.DeleteSignature` (absent) | **Designed** |

`Source: backend/internal/api/routes.go:L45-L51`, `Source: backend/internal/api/handlers/signature.go:L19-L55`.

## Signature lifecycle and asynchronous reconciliation

A signature moves through the lifecycle **`pending → Ready | Failed`**. `SignatureService.RequestSignature(userID, vaultID, dataToSign)` persists the record with the literal status `pending` and then calls the custodian to begin signing. `Source: backend/internal/core/signature/service.go:L24-L47`. Because `internal/custodian` is imported but not present in the readable source, the custodian calls themselves are **Designed**. `Source: backend/internal/core/signature/service.go:L6,L38`.

Reconciliation is performed by the **`SignatureProcessor`**, a background worker that runs on a **five-minute ticker** (`const signatureCheckInterval = 5 * time.Minute`). On each tick it loads pending signatures, calls `CheckSignatureStatus` for each, and then: `Source: backend/internal/tasks/signature_processor.go:L13,L33-L60`.

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

- **Maturity:** **Designed** for the full-resource fetch — the router references `SignatureHandler.GetSignature`, which is not defined. The closest **Implemented** behavior is the *status-check variant* backed by `CheckSignatureStatus`, documented below. `Source: backend/internal/api/routes.go:L49`, `Source: backend/internal/api/handlers/signature.go:L42-L55`.
- **Auth:** Bearer (JWT).
- **Description (intended, Designed):** Retrieve a signature and all of its fields by UUID, mirroring `SignatureService.GetSignature(id)`. `Source: backend/internal/core/signature/service.go:L49-L51`.
- **Description (implemented status-check variant):** `SignatureHandler.CheckSignatureStatus` reads the `:id` path parameter and returns only the reconciled status via `SignatureService.CheckSignatureStatus(id)`, which compares the stored status against the custodian and persists any change. `Source: backend/internal/api/handlers/signature.go:L42-L55`, `Source: backend/internal/core/signature/service.go:L55-L75`. The custodian call is **Designed** (`internal/custodian` is imported but absent). `Source: backend/internal/core/signature/service.go:L6,L61`.

**Parameters**

| Name | In | Type | Required | Description |
|------|----|------|----------|-------------|
| `id` | path | string (uuid) | Yes | Signature identifier. `Source: backend/internal/api/handlers/signature.go:L43`. |

**Responses**

| Status | Meaning |
|--------|---------|
| `200 OK` (full resource) | The signature object (**Designed**). `Source: backend/internal/api/routes.go:L49`. |
| `200 OK` (status-check variant) | `{ "status": <string> }` from `CheckSignatureStatus` (**Implemented**). `Source: backend/internal/api/handlers/signature.go:L49-L55`. |
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

**Example response** — status-check variant (`200 OK`, **Implemented**)

```json
{"status":"Ready"}
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
| `status` | string | No | New lifecycle status (`pending` / `Ready` / `Failed`). `Source: backend/internal/db/schema.go:L63`. |

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
| `status` | string | Lifecycle status; uses `pending` / `Ready` / `Failed`. `Source: backend/internal/db/schema.go:L63`. |
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
