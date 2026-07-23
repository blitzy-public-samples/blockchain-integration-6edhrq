# Transaction Processing Guide

This guide covers the **Transaction Processing** feature (**TP-001**): how transactions are created through the UI and REST API, how the **command/settlement split** moves a transaction from `Pending` to `Processed` asynchronously, and how to troubleshoot the known scaffold defects. The design intent is asynchronous processing so that transaction submission is decoupled from blockchain settlement `Source: documentation/Software Requirements Specifications (SRS).md:§Features`.

For the endpoint contract, see [Transactions API Reference](../api-reference/transactions.md). For the settlement sequence, see [Data Flow](../architecture/data-flow.md) (`Fig B2 - Transaction Create + Async Settlement`). Failure modes are catalogued in the [Runbook](../operations/runbook.md). This guide is linked from the [documentation index](../index.md).

> Maturity legend: **Implemented** = present and working in the code today; **Provisioned** = infrastructure exists but is not wired; **Designed** = specified but absent from the code today.

## Overview

Transaction handling is split into two paths:

- **Command path (Implemented).** `CreateTransaction(userID, vaultID, toAddress, amount)` builds a transaction, sets its status to `Pending`, records the raw transaction, and persists it `Source: backend/internal/core/transaction/service.go:L29-L47`. The `amount` is a `decimal.Decimal` for exact monetary precision `Source: backend/internal/core/transaction/service.go:L29`.
- **Settlement path (Implemented service; Designed adapters).** `ProcessTransaction(id)` signs the transaction with the custodian, broadcasts it to the blockchain, then sets the status to `Processed` and records the transaction hash `Source: backend/internal/core/transaction/service.go:L65-L82`.

The two statuses written by the code are `Pending` `Source: backend/internal/core/transaction/service.go:L46` and `Processed` `Source: backend/internal/core/transaction/service.go:L81`.

| Stage | Operation | Status written | Maturity |
|-------|-----------|----------------|----------|
| Submit | `CreateTransaction` | `Pending` | Implemented |
| Settle | `ProcessTransaction` | `Processed` | Implemented (service); Designed (custodian/blockchain adapters) |
| Cache | `redisClient.Set("tx:"+id, result, 0)` | - | Implemented (no expiry) |

## Setup

**Backend services (Implemented).** The transaction service is constructed via `NewTransactionService(repo, blockchainClient, custodianClient)` `Source: backend/internal/core/transaction/service.go:L18`. Configure PostgreSQL and Redis per [Configuration](../getting-started/configuration.md).

**Backend route group (Implemented).** Transaction routes are registered under `/transactions` with authentication middleware `Source: backend/internal/api/routes.go:L35-L41`:

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

**Submit a transaction (UI).** The Transaction Processing page dispatches `createTransaction` and lists transactions from Redux state `Source: frontend/src/pages/TransactionProcessing.tsx:L28-L29`. It renders the `TransactionForm` and `TransactionList` components.

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

**Processor and service signatures do not match.** The processor calls the settlement path as `ProcessTransaction(ctx, tx)` and reads `result.Status`, but the service defines `ProcessTransaction(id uuid.UUID) error` `Source: backend/internal/core/transaction/service.go:L65`, invoked from the processor at `Source: backend/internal/tasks/transaction_processor.go:L41`. This signature mismatch (**Implemented defect**) prevents the settlement loop from compiling as-wired. See failure mode FM-4 in the [Runbook](../operations/runbook.md).

**Transactions never leave `Pending`.** The settlement loop does not run today: the backend does not compile because the processor call site does not match the service signature (failure mode FM-4), and even once it built the transaction processor carries the latent ticker panic (failure mode FM-1). Pending transactions are therefore not advanced to `Processed`. Confirm the backend builds and the settlement processor is running before investigating data issues.

**Cached results never expire.** The Redis write uses a TTL of `0` (no expiry) for `tx:<id>` entries `Source: backend/internal/tasks/transaction_processor.go:L55`; stale settlement results accumulate. Behavior is **Implemented**; documented as a caching caveat.

**Store-slice key mismatch in the UI.** The Redux store registers the reducer under the singular key `transaction` `Source: frontend/src/store/index.ts:L10`, while the page selects `state.transactions` (plural) `Source: frontend/src/pages/TransactionProcessing.tsx:L28`. Selections resolve against an undefined slice (**Implemented defect**). Documented, not fixed.

## Related documentation

- [Transactions API Reference](../api-reference/transactions.md) - endpoint contract for the five transaction routes.
- [Data Flow](../architecture/data-flow.md) - `Fig B2 - Transaction Create + Async Settlement`.
- [Runbook](../operations/runbook.md) - FM-1 (ticker panic) and FM-4 (processor/router wiring mismatch) remediation.
- [Scaffold vs Design](../architecture/scaffold-vs-design.md) - status-vocabulary reconciliation.
- [Documentation index](../index.md).
