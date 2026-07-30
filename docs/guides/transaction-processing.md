# Transaction Processing Guide

This guide covers the **Transaction Processing** feature (**TP-001**): how transactions are created through the UI and REST API, how the **command/settlement split** moves a transaction from `Pending` to `Processed` asynchronously, and how to troubleshoot the known scaffold defects. The design intent is asynchronous processing so that transaction submission is decoupled from blockchain settlement `Source: documentation/Software Requirements Specifications (SRS).md:§Features`.

For the endpoint contract, see [Transactions API Reference](../api-reference/transactions.md). For the settlement sequence, see [Data Flow](../architecture/data-flow.md) (`Fig B2 - Transaction Create + Async Settlement`). Failure modes are catalogued in the [Runbook](../operations/runbook.md). This guide is linked from the [documentation index](../index.md).

> Maturity legend (identical to [Scaffold vs Design](../architecture/scaffold-vs-design.md)): **Implemented** = present in the repository AND compiles AND runs today; reserved, and nothing here qualifies at this checkpoint. **Source-present (non-buildable)** = code exists but does not compile today, so no runtime behavior may be asserted. **Provisioned** = configuration exists and would validly apply but is not wired. **Designed** = specified in the corpus but absent from the code today.

## Overview

Transaction handling is split into two paths:

- **Command path (source-present, non-buildable).** `CreateTransaction(userID, vaultID, toAddress, amount)` is coded to build a transaction, set its status to pending, record the raw transaction, and persist it `Source: backend/internal/core/transaction/service.go:L29-L47`. The `amount` is a `decimal.Decimal` for exact monetary precision `Source: backend/internal/core/transaction/service.go:L29`. It does not compile: `repo` is typed `*db.Repository` (absent), `blockchainClient.CreateRawTransaction` targets the absent `blockchain` package, and the status is set from `db.TransactionStatusPending`, an undefined constant (see Build blockers).
- **Settlement path (source-present, non-buildable; Designed adapters).** `ProcessTransaction(id)` is coded to sign the transaction with the custodian, broadcast it to the blockchain, then set the status to processed and record the transaction hash `Source: backend/internal/core/transaction/service.go:L65-L82`. The custodian and blockchain adapter packages are absent, and `db.TransactionStatusProcessed` is undefined, so this path is Designed rather than runnable.

The two status constants the code assigns are `db.TransactionStatusPending` `Source: backend/internal/core/transaction/service.go:L46` and `db.TransactionStatusProcessed` `Source: backend/internal/core/transaction/service.go:L81`; both are **undefined** in the `db` package today, so the intended `Pending`/`Processed` string values are Designed, not compiled.

| Stage | Operation | Status intended | Maturity |
|-------|-----------|-----------------|----------|
| Submit | `CreateTransaction` | `Pending` | Source-present (non-buildable); repo/adapter/status-constant absent |
| Settle | `ProcessTransaction` | `Processed` | Source-present (non-buildable); Designed custodian/blockchain adapters |
| Cache | `redisClient.Set("tx:"+id, result, 0)` | - | Source-present (non-buildable); no expiry (TTL 0) |

### TP-001 capability and status matrix

The SRS defines six TP-001 subrequirements `Source: documentation/Software Requirements Specifications (SRS).md:Section 1 (TP-001)`. Honest status against the current scaffold:

| TP-001 subrequirement | SRS intent | Delivery surface (source) | Status |
|-----------------------|-----------|---------------------------|--------|
| TP-001-1 Create Transaction | Create transactions for XRP/Ethereum | `CreateTransaction`; `TransactionForm` | Source-present (non-buildable) |
| TP-001-2 Sign Transaction | Sign via Utxo custodian | `custodianClient.SignTransaction` | Designed (custodian package absent) |
| TP-001-3 Broadcast Transaction | Broadcast to blockchain | `blockchainClient.BroadcastTransaction` | Designed (blockchain package absent) |
| TP-001-4 Transaction Status | Real-time status updates | `GetTransaction`; status constants | Source-present (non-buildable); status constants undefined, no real-time channel wired |
| TP-001-5 Transaction History | Maintain/display all-transaction history | `TransactionList` from Redux; no history/pagination API | Designed (no history endpoint or store) |
| TP-001-6 Transaction Analytics | Volumes, success rates, processing times | none | Designed (not present in code) |

Only TP-001-1 through TP-001-4 have any source; TP-001-5 (history) and TP-001-6 (analytics) are entirely Designed. None runs today because the backend and SPA do not compile.

### Build blockers (read first)

Transaction processing does not run today. Resolve these before any runtime behavior below applies (all documented, none fixed):

1. **No `go.mod`.** The backend is not a Go module.
2. **`db.Repository` absent.** `TransactionService.repo` is `*db.Repository`, and `GetVaultByID`, `GetTransactionByID`, `CreateTransaction`, and `UpdateTransaction` all target it `Source: backend/internal/core/transaction/service.go:L13,L30,L50,L66,L84`.
3. **`blockchain` and `custodian` adapters absent.** `CreateRawTransaction`, `BroadcastTransaction`, and `SignTransaction` cannot resolve `Source: backend/internal/core/transaction/service.go:L7-L8,L35,L71,L76`.
4. **Model/helper gaps.** `db.TransactionStatusPending`/`db.TransactionStatusProcessed` constants are undefined in the `db` package, and `pkg/utils` (imported) does not exist `Source: backend/internal/core/transaction/service.go:L9,L46,L81`.
5. **Logger absent.** The settlement processor imports the absent `backend/pkg/logger` and calls `db.GetPendingTransactions`/`db.UpdateTransaction`, which are undefined `Source: backend/internal/tasks/transaction_processor.go:L10,L35,L48`.
6. **Processor/service signature mismatch.** The processor calls `ProcessTransaction(ctx, tx)` and reads `result.Status`, but the service defines `ProcessTransaction(id uuid.UUID) error` (see Troubleshooting, FM-4).
7. **Frontend thunk/slice/hooks.** The page selects the plural `state.transactions` while the store registers the singular `transaction` reducer, imports typed hooks the store does not export, and dispatches a `createTransaction` thunk from a slice that must be built (see Troubleshooting).

## Setup

**Backend services (source-present, non-buildable).** The transaction service is coded to take a repository and blockchain/custodian clients via `NewTransactionService(repo, blockchainClient, custodianClient)` `Source: backend/internal/core/transaction/service.go:L18`, but all three dependency types are absent (Build blockers 2-3), so the service does not compile. Configure PostgreSQL and Redis per [Configuration](../getting-started/configuration.md) as the designed setup.

**Backend route group (source-present).** Transaction routes are declared under `/transactions` with authentication middleware attached in source `Source: backend/internal/api/routes.go:L35-L41`; the group wires handler methods that are not defined (as with the vault group), so the `api` package does not compile and no route is served today:

```text
POST   /transactions/create
GET    /transactions/list
GET    /transactions/:id
PUT    /transactions/:id
DELETE /transactions/:id
```

There is no `/api/v1` prefix in the router `Source: backend/internal/api/routes.go:L9-L54`. See [Transactions API Reference](../api-reference/transactions.md) for schemas.

**Async settlement processor (Designed - does not start as-wired).** The background processor is intended to poll for pending transactions on a ticker and settle them `Source: backend/internal/tasks/transaction_processor.go:L15-L16`. It does not run today: the backend does not compile, so the build fails first (the processor/router wiring mismatch, failure mode FM-4; see Troubleshooting). A latent zero-duration ticker panic is also present and would surface only after those compile blockers are resolved. Live settlement is therefore **Designed** rather than runnable, with the build failure - not the ticker panic - as the primary current blocker.

## Usage

**Submit a transaction (UI) - as designed.** The Transaction Processing page is coded to dispatch `createTransaction` and list transactions from Redux state `Source: frontend/src/pages/TransactionProcessing.tsx:L28-L29`, rendering the `TransactionForm` and `TransactionList` components. It does not run today: the page selects an undefined slice (`state.transactions`) and imports typed hooks the store does not export (see Troubleshooting and Build blocker 7).

**Async settlement (command/settlement split).** After submission, a transaction is `Pending` until the settlement path runs. The intended flow is: the processor reads pending transactions, calls the settlement path, updates the record, and caches the result in Redis `Source: backend/internal/tasks/transaction_processor.go:L34-L55`. The cache entry is written under key `tx:<id>` with a TTL of `0`, meaning no expiry `Source: backend/internal/tasks/transaction_processor.go:L55`. This sequence is drawn as `Fig B2 - Transaction Create + Async Settlement` in [Data Flow](../architecture/data-flow.md).

### Status-vocabulary divergence (must-read)

The backend and frontend use different transaction status vocabularies:

| Layer | Status values | Source |
|-------|---------------|--------|
| Backend service | `Pending`, `Processed` | `Source: backend/internal/core/transaction/service.go:L46,L81` |
| Frontend Zod schema | `Pending`, `Completed`, `Failed` | `Source: frontend/src/schema/transaction.ts:L10` |

**Maturity: Designed reconciliation.** The backend never emits `Completed` or `Failed`, and the frontend does not model `Processed`; a status arriving from the API as `Processed` will not match the client enum. Documented, not fixed. Tracked in [Scaffold vs Design](../architecture/scaffold-vs-design.md).

## Troubleshooting

**Latent zero-duration ticker panic.** `transactionCheckInterval` is declared but never assigned, so it defaults to `0`; `time.NewTicker(transactionCheckInterval)` would then receive `0` and panic `Source: backend/internal/tasks/transaction_processor.go:L13-L16`. This is a **latent** runtime defect: it is not observable today because the backend does not compile (the build fails first, failure mode FM-4), so the panic is reachable only once those compile blockers are resolved. The primary current blocker to settlement is therefore the build failure, not this panic. Detection and remediation are documented as failure mode FM-1 in the [Runbook](../operations/runbook.md). Documented, not fixed.

**Processor and service signatures do not match.** The processor calls the settlement path as `ProcessTransaction(ctx, tx)` and reads `result.Status`, but the service defines `ProcessTransaction(id uuid.UUID) error` `Source: backend/internal/core/transaction/service.go:L65`, invoked from the processor at `Source: backend/internal/tasks/transaction_processor.go:L41`. This signature mismatch (**source-present defect, non-buildable**) prevents the settlement loop from compiling as-wired. See failure mode FM-4 in the [Runbook](../operations/runbook.md).

**Transactions never leave `Pending`.** The settlement loop does not run today: the backend does not compile because the processor call site does not match the service signature (failure mode FM-4), and even once it built the transaction processor carries the latent ticker panic (failure mode FM-1). Pending transactions are therefore not advanced to `Processed`. Confirm the backend builds and the settlement processor is running before investigating data issues.

**Settlement retries have no backoff (failure mode FM-2).** Once the loop does run, a transaction whose settlement errors is *not* retried with backoff: the processor logs the error via `logger.Error(...)` and `continue`s, leaving the record `Pending` for an implicit retry on the next ticker tick, with no retry counter and no dead-letter path `Source: backend/internal/tasks/transaction_processor.go:L44,L50,L57`. A persistently failing transaction therefore retries forever at the ticker cadence while settlement lag climbs. This is **failure mode FM-2** in the [Runbook](../operations/runbook.md), whose alert fires when the maximum pending age exceeds the **300 s** red threshold on the settlement-lag panel (`id: 9`) of [`dashboard-template.json`](../operations/dashboard-template.json) — a **Designed placeholder** value, since `transactionCheckInterval` is uninitialized and supplies no cadence to derive from `Source: backend/internal/tasks/transaction_processor.go:L13-L16`. Maturity is **source-present (non-buildable)**: this is the behavior of the as-written code, not observed runtime behavior. Documented, not fixed.

**Cached results never expire (as coded).** The Redis write uses a TTL of `0` (no expiry) for `tx:<id>` entries `Source: backend/internal/tasks/transaction_processor.go:L55`; as written, stale settlement results would accumulate. Maturity is **source-present (non-buildable)** - the processor does not compile (absent `pkg/logger` and undefined `db` helpers), so this is a documented caching caveat of the as-written code, not observed runtime behavior.

**Store-slice key mismatch in the UI.** The Redux store registers the reducer under the singular key `transaction` `Source: frontend/src/store/index.ts:L10`, while the page selects `state.transactions` (plural) `Source: frontend/src/pages/TransactionProcessing.tsx:L28`. Selections resolve against an undefined slice (**source-present defect, non-buildable**). Documented, not fixed.

## Related documentation

- [Transactions API Reference](../api-reference/transactions.md) - endpoint contract for the five transaction routes.
- [Data Flow](../architecture/data-flow.md) - `Fig B2 - Transaction Create + Async Settlement`.
- [Runbook](../operations/runbook.md) - FM-1 (latent ticker panic), FM-2 (settlement retry behavior, no backoff) and FM-4 (processor/router wiring mismatch) remediation.
- [Observability dashboard template](../operations/dashboard-template.json) - the settlement-lag panel (`id: 9`) that FM-2's alert is defined against.
- [Scaffold vs Design](../architecture/scaffold-vs-design.md) - status-vocabulary reconciliation.
- [Documentation index](../index.md).
