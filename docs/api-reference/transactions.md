# API Reference — Transactions

A **transaction** moves value from a custodial vault to a destination on-chain address. Transaction creation is a **synchronous command** that persists a new record with status `Pending` and returns immediately; settlement to `Processed` (with the on-chain `TxHash`) is performed **asynchronously** by a background processor. This page documents the five transaction endpoints as wired in the router — all grouped under `/transactions` and all bearer-protected. `Source: backend/internal/api/routes.go:L35-L41`. Only transaction creation has a defined handler method (`CreateTransaction`), so `POST /transactions/create` is **Source-present (non-buildable)**; the remaining routes are registered but their handler methods are not defined in the scaffold and are therefore **Designed**. Nothing on this page runs today: the backend has no `go.mod`, the `api` package imports the absent `middleware` package, and the transaction path additionally depends on the absent `internal/blockchain`, `internal/custodian`, and `pkg/utils` packages. `Source: backend/internal/api/handlers/transaction.go:L21-L51`.

The machine-readable contract for these endpoints lives in [`openapi.yaml`](openapi.yaml); the canonical Transaction entity definition lives in [`../architecture/data-model.md`](../architecture/data-model.md#fig-m1--data-model-erd) (see **Fig M1 — Data Model ERD**). Example values on this page are reused from the OpenAPI specification so both documents stay in sync.

## Maturity Legend

Every endpoint below is labeled with the project-wide maturity discipline:

- **Implemented** — present in code, building, and functional today. Per the single operational-truth vocabulary in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md), this label is **reserved** and **nothing qualifies for it** at this checkpoint; it is not applied on this page.
- **Source-present (non-buildable)** — the handler method is written in source, but the containing package does not compile. No request/response behavior may be asserted as running. Equivalent to *Implemented-with-defects* on the architecture pages.
- **Designed** — the route is registered (or the behavior is specified in the design corpus), but the backing handler method is not defined in the readable handler source.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.

> **Inferred contracts are Designed.** For every endpoint labeled **Designed** below (`GET /transactions/list`, `GET /transactions/:id`, `PUT /transactions/:id`, `DELETE /transactions/:id`), the request/response shapes, status codes, enumerations, and update/delete semantics are **inferred** from the design corpus (Technical Specification §API DESIGN) and the `Transaction` entity model — they are **Designed**, not defined in code. `Source: documentation/Technical Specifications.md:§API DESIGN`.

The consolidated Implemented / Provisioned / Designed matrix that reconciles the design corpus with the on-disk scaffold is maintained in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Authentication and base URL

All transaction routes are registered under the group `router.Group("/transactions", middleware.AuthMiddleware())`, so each route is **declared** to require a JWT bearer token in the `Authorization: Bearer <token>` header; a token would be obtained from `POST /auth/login`. `Source: backend/internal/api/routes.go:L35`. The `middleware` package is imported but absent in the current scaffold, so bearer **enforcement is Designed** — the wiring intent is present in source, but no token check runs (and the package does not compile). The frontend Axios client is coded to attach the same bearer header via a request interceptor. `Source: frontend/src/services/api.ts:L11-L16`.

The router registers routes at the root with **no version prefix**, which contradicts the `/api/v1/...` paths documented in the design corpus. The base URL `http://localhost:8080` used in the examples below is **illustrative only**: no server bind address or port is configured in code, and the frontend Axios client defaults its base URL to `https://api.example.com` (overridable via `REACT_APP_API_BASE_URL`), not localhost. The full resource map and the `swag` generation workflow are described in the [API reference overview](overview.md). `Source: backend/internal/api/routes.go:L9-L14`, `Source: frontend/src/services/api.ts:L4`.

## Command / settlement split

Transaction processing is split into two paths, mirroring the backend's command/settlement design:

- **Command path (synchronous, Source-present, non-buildable).** `POST /transactions/create` is coded to call `TransactionService.CreateTransaction(userID, vaultID, toAddress, amount)`, which is written to load the source vault via `GetVaultByID`, build an unsigned transaction through the blockchain client, and persist a `Transaction` with `Status = Pending` before returning `201`. It does not run today (absent `internal/blockchain`/`internal/custodian`/`pkg/utils`, undefined `db.Repository`/`db.TransactionStatus*`, and no `go.mod`). `Source: backend/internal/core/transaction/service.go:L29-L56`.
- **Settlement path (asynchronous, Source-present, non-buildable; latent startup panic).** A ticker-based `TransactionProcessor` is written to poll pending transactions, call `ProcessTransaction(id)` (sign via the custodian, broadcast via the blockchain client), and advance each record to `Status = Processed` while setting its `TxHash`. `Source: backend/internal/core/transaction/service.go:L65-L85`. The processor code exists, but `transactionCheckInterval` is declared and never initialized, so `time.NewTicker(transactionCheckInterval)` is effectively `time.NewTicker(0)`, which panics. `Source: backend/internal/tasks/transaction_processor.go:L13-L16`. This is a **latent** defect: the worker package does not compile today (absent `pkg/logger`, undefined `db` symbols, a mismatched `StartTransactionProcessor` call site), so the panic is only reachable once the compile blockers are resolved. The failure mode and its remediation are catalogued in the operations [`runbook.md`](../operations/runbook.md#fm-1--uninitialized-ticker-panic-at-startup).

The end-to-end sequence — synchronous command plus asynchronous settlement — is diagrammed as **Fig B2 — Transaction Create + Async Settlement** in [`../architecture/data-flow.md`](../architecture/data-flow.md#fig-b2--transaction-create--async-settlement).

## Status vocabulary mismatch

The transaction **status** vocabulary differs between the backend and the frontend. This page documents the **backend vocabulary as authoritative** for the API, because it is what the service source is written to read and write (no service runs today, as the package does not build); the frontend enum diverges and is a documented reconciliation item (**Designed** to reconcile). The divergence is never silently reconciled.

| Backend (authoritative) | Frontend Zod schema |
|-------------------------|---------------------|
| `Pending` | `Pending` |
| `Processed` | `Completed` |
| _(no equivalent)_ | `Failed` |

The backend sets `db.TransactionStatusPending` on create and `db.TransactionStatusProcessed` on settlement, so its only two states are `Pending` and `Processed`. `Source: backend/internal/core/transaction/service.go:L46,L81`. The frontend Zod schema instead validates the three-state vocabulary `['Pending', 'Completed', 'Failed']`. `Source: frontend/src/schema/transaction.ts:L10`. A client that expects `Completed`/`Failed` will never match the backend's `Processed` state. This and the other design-versus-scaffold gaps are tracked in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

The `blockchainType` values `XRP` / `Ethereum` line up conceptually across both layers, but the constraint is written only on the client: the frontend Zod schema enumerates `z.enum(['XRP', 'Ethereum'])`, whereas the backend field is a plain, unconstrained `string`. The backend enumeration is therefore **Designed** — and even the client-side check is **intended, not enforced today**: the frontend Zod schema is source-present but non-buildable (it imports `zod`, which `frontend/package.json` does not declare), so no validation actually runs on either layer at this checkpoint. `Source: backend/internal/db/schema.go:L50`, `Source: frontend/src/schema/transaction.ts:L11`, `Source: frontend/package.json`.

## POST /transactions/create

**Maturity:** Source-present (non-buildable) — `Source: backend/internal/api/handlers/transaction.go:L21-L35`.
**Auth:** Bearer (required).

**Description.** The handler is written to create a transaction on the synchronous command path: it binds the JSON body to `transaction.CreateTransactionRequest`, calls `TransactionService.CreateTransaction`, and returns the created transaction with `201` and `status: "Pending"`. `Source: backend/internal/api/handlers/transaction.go:L21-L35`. Settlement to `Processed` happens later on the asynchronous path (see [Command / settlement split](#command--settlement-split)). Note a handler/service signature mismatch: the handler passes a single `CreateTransactionRequest` value, while the service signature takes four scalar arguments `(userID, vaultID, toAddress, amount)` — the request body below is inferred from the service signature. `Source: backend/internal/api/handlers/transaction.go:L28`, `Source: backend/internal/core/transaction/service.go:L29`.

**Path/query parameters.** None.

**Request body.** `CreateTransactionRequest`. The `userID` is **not** part of the body; it is resolved server-side from the JWT. Fields are inferred from the service constructor `TransactionService.CreateTransaction(userID, vaultID, toAddress, amount)`. `Source: backend/internal/core/transaction/service.go:L29`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `vaultId` | string (UUID) | Yes | Source vault the transaction draws from. `Source: backend/internal/core/transaction/service.go:L30`. |
| `toAddress` | string | Yes | Destination on-chain address. `Source: backend/internal/core/transaction/service.go:L35`. |
| `amount` | string | Yes | Arbitrary-precision decimal serialized as a string (backed by `decimal.Decimal`). `Source: backend/internal/db/schema.go:L52`. |

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `201 Created` | `Transaction` | Transaction created with `status: "Pending"`. `Source: backend/internal/api/handlers/transaction.go:L34`. |
| `400 Bad Request` | `{ "error": "Invalid request payload" }` | Body failed JSON binding. `Source: backend/internal/api/handlers/transaction.go:L23-L25`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L35`. |
| `500 Internal Server Error` | `{ "error": "Failed to create transaction" }` | Service or persistence failure. `Source: backend/internal/api/handlers/transaction.go:L29-L31`. |

**Request example.**

```bash
curl -X POST http://localhost:8080/transactions/create -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"vaultId":"1b4e28ba-2fa1-11d2-883f-0016d3cca427","toAddress":"<xrp-destination-address>","amount":"10.5"}'
```

> **Address examples — test values only, never send funds (applies to every example on this page).** The `toAddress` shown is an unmistakable placeholder (`<xrp-destination-address>`) that is **not** a valid, sendable account. Do not copy it into a live request; when exercising the API against a running environment, substitute a destination you control on a **test network only** (for example the XRPL Testnet) and never transmit real funds or mainnet transactions to any value taken from this document.

**Response example** (`201 Created`).

```json
{ "id": "16fd2706-8baf-433b-82eb-8c7fada847da", "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "vaultId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
  "status": "Pending", "blockchainType": "XRP", "txHash": "", "amount": "10.5", "metadata": {},
  "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:30:00Z" }
```

> **Serialization caveat (applies to every `Transaction` response example on this page).** The lower-camelCase keys above (`id`, `userId`, `vaultId`, `blockchainType`, `txHash`, `createdAt`, …) are the **Designed** response DTO. The `Transaction` struct carries **no `json` tags** and embeds `gorm.Model`, and the `CreateTransaction` handler marshals it directly (`c.JSON(201, createdTransaction)`); were it to compile and marshal as-declared, the actual keys would be **PascalCase** (`ID`, `UserID`, `VaultID`, `Status`, `BlockchainType`, `TxHash`, `Amount`, `Metadata`, `CreatedAt`, `UpdatedAt`) plus a promoted `DeletedAt`. Note also that `amount` is a JSON **string** here (`decimal.Decimal`), while the frontend Zod schema types it as a **number** — a further divergence. See [Response Serialization](overview.md#response-serialization--designed-camelcase-contract-vs-actual-pascalcase-output). `Source: backend/internal/db/schema.go:L44-L56`, `Source: backend/internal/api/handlers/transaction.go:L34`.

## GET /transactions/list

**Maturity:** Designed — the route is registered but no matching handler method is defined in the readable handler source. `Source: backend/internal/api/routes.go:L38`.
**Auth:** Bearer (required).

**Description.** Lists the transactions visible to the caller. The router binds this route to `TransactionHandler.ListTransactions`, but the handler source defines only `CreateTransaction` and `GetTransactionStatus`, so `ListTransactions` is not present and the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L38`, `Source: backend/internal/api/handlers/transaction.go:L21-L51`. The intended behavior returns `200` with an array of `Transaction` objects once a handler is defined.

**Path/query parameters.** None.

**Request body.** None.

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `Transaction[]` | Array of transactions for the caller. `Source: backend/internal/api/routes.go:L38`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L35`. |

**Request example.**

```bash
curl http://localhost:8080/transactions/list -H "Authorization: Bearer <token>"
```

**Response example** (`200 OK`).

```json
[ { "id": "16fd2706-8baf-433b-82eb-8c7fada847da", "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "vaultId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
    "status": "Processed", "blockchainType": "XRP", "txHash": "E3FE6EA3D48F0C2B639448020EA4F03D4F4F8FFDB243A852A0F59177921B4879",
    "amount": "10.5", "metadata": {}, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:35:00Z" } ]
```

## GET /transactions/:id

**Maturity:** Designed — handler/route name mismatch (see below).
**Auth:** Bearer (required).

**Description.** Retrieves a single transaction by its UUID. The router references `TransactionHandler.GetTransaction`, but the handler source does not define `GetTransaction` — it defines `GetTransactionStatus` instead — so the route does not resolve to a defined method as written, and the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L39`, `Source: backend/internal/api/handlers/transaction.go:L37-L51`. Two behaviors are documented because the route name and the source-present handler disagree:

- **Intended full-resource GET (Designed).** Returns the complete `Transaction` object, backed by `TransactionService.GetTransaction(transactionID)`. `Source: backend/internal/core/transaction/service.go:L58-L60`.
- **Source-present status-only variant (`GetTransactionStatus`).** The defined handler reads the `id` path parameter, returns `400 { "error": "Transaction ID is required" }` when it is empty, and otherwise returns `200 { "status": ... }` or `404 { "error": "Transaction not found" }`. `Source: backend/internal/api/handlers/transaction.go:L37-L51`. This handler is not wired to any route (the route references `GetTransaction`), and it calls a `GetTransactionStatus` service method that is not defined in the service source (the service defines `GetTransaction`). `Source: backend/internal/core/transaction/service.go:L58`.

**Path/query parameters.**

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `id` | path | string (UUID) | Yes | Transaction identifier. Gin `:id` path parameter. `Source: backend/internal/api/routes.go:L39`. |

**Request body.** None.

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` (intended) | `Transaction` | The requested transaction. `Source: backend/internal/core/transaction/service.go:L58-L60`. |
| `200 OK` (source-present variant) | `{ "status": "Processed" }` | Status-only body from `GetTransactionStatus`. `Source: backend/internal/api/handlers/transaction.go:L50`. |
| `400 Bad Request` | `{ "error": "Transaction ID is required" }` | Empty `id` path parameter (source-present variant). `Source: backend/internal/api/handlers/transaction.go:L39-L41`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L35`. |
| `404 Not Found` | `{ "error": "Transaction not found" }` | No transaction with the given ID. `Source: backend/internal/api/handlers/transaction.go:L46`. |

**Request example.**

```bash
curl http://localhost:8080/transactions/16fd2706-8baf-433b-82eb-8c7fada847da \
  -H "Authorization: Bearer <token>"
```

**Response example** — intended full resource (`200 OK`).

```json
{ "id": "16fd2706-8baf-433b-82eb-8c7fada847da", "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "vaultId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
  "status": "Processed", "blockchainType": "XRP", "txHash": "E3FE6EA3D48F0C2B639448020EA4F03D4F4F8FFDB243A852A0F59177921B4879",
  "amount": "10.5", "metadata": {}, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:35:00Z" }
```

**Response example** — source-present status-only variant (`200 OK`).

```json
{ "status": "Processed" }
```

## PUT /transactions/:id

**Maturity:** Designed — the route is registered but its handler method is not defined in the readable handler source. `Source: backend/internal/api/routes.go:L40`.
**Auth:** Bearer (required).

**Description.** Updates a transaction's mutable attributes (for example its status). The route maps to `TransactionHandler.UpdateTransaction`, which is not present in the handler source, so the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L40`. The `status` field uses the backend vocabulary `Pending` / `Processed` (see [Status vocabulary mismatch](#status-vocabulary-mismatch)); immutable identity fields (`id`, `userId`, `vaultId`, `blockchainType`) are not updatable.

**Path/query parameters.**

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `id` | path | string (UUID) | Yes | Transaction identifier. Gin `:id` path parameter. `Source: backend/internal/api/routes.go:L40`. |

**Request body.** `UpdateTransactionRequest` (inferred; **Designed**). All fields optional.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | string | No | One of `Pending` or `Processed` (backend vocabulary). `Source: backend/internal/core/transaction/service.go:L46,L81`. |

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `200 OK` | `Transaction` | The updated transaction. `Source: backend/internal/api/routes.go:L40`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L35`. |
| `404 Not Found` | `{ "error": "Transaction not found" }` | No transaction with the given ID. `Source: backend/internal/api/routes.go:L40`. |

**Request example.**

```bash
curl -X PUT http://localhost:8080/transactions/16fd2706-8baf-433b-82eb-8c7fada847da \
  -H "Authorization: Bearer <token>" -d '{"status":"Processed"}'
```

**Response example** (`200 OK`).

```json
{ "id": "16fd2706-8baf-433b-82eb-8c7fada847da", "userId": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "vaultId": "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
  "status": "Processed", "blockchainType": "XRP", "txHash": "E3FE6EA3D48F0C2B639448020EA4F03D4F4F8FFDB243A852A0F59177921B4879",
  "amount": "10.5", "metadata": {}, "createdAt": "2024-01-15T09:30:00Z", "updatedAt": "2024-01-15T09:40:00Z" }
```

## DELETE /transactions/:id

**Maturity:** Designed — the route is registered but its handler method is not defined in the readable handler source. `Source: backend/internal/api/routes.go:L41`.
**Auth:** Bearer (required).

**Description.** Deletes a transaction by its UUID. The route maps to `TransactionHandler.DeleteTransaction`, which is not present in the handler source, so the endpoint is **Designed**. `Source: backend/internal/api/routes.go:L41`. On success the intended response carries no body (`204 No Content`); a `200 OK` acknowledgement envelope is an acceptable alternative in the target design.

**Path/query parameters.**

| Parameter | In | Type | Required | Notes |
|-----------|----|------|----------|-------|
| `id` | path | string (UUID) | Yes | Transaction identifier. Gin `:id` path parameter. `Source: backend/internal/api/routes.go:L41`. |

**Request body.** None.

**Responses.**

| Status | Body | Meaning |
|--------|------|---------|
| `204 No Content` | (empty) | Transaction deleted. `Source: backend/internal/api/routes.go:L41`. |
| `401 Unauthorized` | `{ "error": "Unauthorized" }` | Missing/invalid bearer token (Designed `AuthMiddleware`). `Source: backend/internal/api/routes.go:L35`. |
| `404 Not Found` | `{ "error": "Transaction not found" }` | No transaction with the given ID. `Source: backend/internal/api/routes.go:L41`. |

**Request example.**

```bash
curl -X DELETE http://localhost:8080/transactions/16fd2706-8baf-433b-82eb-8c7fada847da \
  -H "Authorization: Bearer <token>"
```

**Response example** (`204 No Content`).

```http
HTTP/1.1 204 No Content
```

## Transaction entity

The transaction resource is the `Transaction` GORM model. Its fields are not re-defined exhaustively here — the canonical definition, including the dual-identifier gap note, is maintained in [`../architecture/data-model.md`](../architecture/data-model.md#fig-m1--data-model-erd) under **Fig M1 — Data Model ERD**. `Source: backend/internal/db/schema.go:L44-L56`.

Key points for API consumers:

- `status` is the backend lifecycle status, one of `Pending` or `Processed`; see [Status vocabulary mismatch](#status-vocabulary-mismatch) for the frontend divergence. `Source: backend/internal/core/transaction/service.go:L46,L81`.
- `amount` is an arbitrary-precision decimal (`decimal.Decimal` in code) and is serialized as a JSON **string** (for example `"10.5"`) to avoid floating-point rounding. The frontend Zod schema types it as a number, a documented divergence. `Source: backend/internal/db/schema.go:L52`, `Source: frontend/src/schema/transaction.ts:L13`.
- `txHash` is empty on creation and is populated only after asynchronous settlement broadcasts the transaction on-chain. `Source: backend/internal/core/transaction/service.go:L82`.
- `blockchainType` is a plain `string` in code; the enumerated chains `XRP` / `Ethereum` are specified only by the frontend Zod schema — which is source-present but non-buildable (`zod` is undeclared in `frontend/package.json`), so the client check is **intended, not enforced today** — and the enumeration is **Designed** on the backend. `Source: backend/internal/db/schema.go:L50`, `Source: frontend/src/schema/transaction.ts:L11`, `Source: frontend/package.json`.
- `metadata` is a free-form JSON object *intended* to persist as JSONB via `gorm.JSONMap` — **Designed**, not functional: `gorm.JSONMap` is undefined in `gorm.io/gorm`, so `schema.go` does not compile as-declared and no JSONB column is created (see [`../architecture/data-model.md#notable-field-types`](../architecture/data-model.md#notable-field-types)). `Source: backend/internal/db/schema.go:L53`.
- The command path accepts a `toAddress` and builds a `rawTx`, but the persisted `Transaction` entity in `schema.go` declares neither a `toAddress` nor a `rawTx` column — a **Designed** persistence gap tracked in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md). `Source: backend/internal/core/transaction/service.go:L44,L47`, `Source: backend/internal/db/schema.go:L44-L56`.

## Related documentation

- [API reference overview](overview.md) — resource map, maturity discipline, and the `swag` generation workflow.
- [OpenAPI specification](openapi.yaml) — the machine-readable contract for all transaction operations.
- [Vaults API reference](vaults.md) — the vault resource that owns transactions.
- [Data Model Reference — Fig M1](../architecture/data-model.md#fig-m1--data-model-erd) — canonical Transaction entity and relationships.
- [Data Flow & Sequences — Fig B2](../architecture/data-flow.md#fig-b2--transaction-create--async-settlement) — the command path plus asynchronous settlement sequence.
- [Operations runbook](../operations/runbook.md#fm-1--uninitialized-ticker-panic-at-startup) — the uninitialized-ticker panic and settlement failure modes.
- [Scaffold vs. Design reconciliation](../architecture/scaffold-vs-design.md) — the full Implemented / Provisioned / Designed matrix behind the maturity labels above.
