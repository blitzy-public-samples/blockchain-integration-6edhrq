# Signature Management Guide

This guide covers the **Signature Generation and Management** feature (**SG-001**): how a signature is requested, how its status is polled asynchronously on a fixed interval until it is `Ready` or `Failed`, and the **Designed** publish-to-Kafka step. It also documents the known scaffold defects in the signature UI. Signatures are produced by the external Custodian, not by the application itself `Source: documentation/Software Requirements Specifications (SRS).md:§Glossary`.

For the endpoint contract, see [Signatures API Reference](../api-reference/signatures.md). For the generation sequence, see [Data Flow](../architecture/data-flow.md) (`Fig B3 - Signature Generation + Kafka Publish (Designed)`). Failure modes are catalogued in the [Runbook](../operations/runbook.md). This guide is linked from the [documentation index](../index.md).

> Maturity legend: **Implemented** = present and working in the code today; **Provisioned** = infrastructure exists but is not wired; **Designed** = specified but absent from the code today.

## Overview

Signature generation follows a request-then-poll lifecycle:

- **Request (Implemented).** `RequestSignature(userID, vaultID, dataToSign)` creates a signature record with status `pending`, persists it, then asks the custodian to sign `Source: backend/internal/core/signature/service.go:L24-L38` (status `pending` set at L30, persisted at L33, custodian call at L38).
- **Poll (Implemented).** `CheckSignatureStatus(id)` polls the custodian and updates the record if the status changed `Source: backend/internal/core/signature/service.go:L55-L72` (poll at L61, conditional update at L66-L72).
- **Publish to Kafka (Designed).** The SRS commits to publishing completed signatures to a Kafka topic (SG-001-4) `Source: documentation/Software Requirements Specifications (SRS).md:§Features`; this step is **not** present in the signature processor `Source: backend/internal/tasks/signature_processor.go:L33-L57` and is therefore Designed only.

| Stage | Operation | Status | Maturity |
|-------|-----------|--------|----------|
| Request | `RequestSignature` | `pending` | Implemented |
| Poll | `CheckSignatureStatus` (5-minute interval) | `Ready` / `Failed` | Implemented |
| Publish | Kafka fan-out (SG-001-4) | - | Designed |

## Setup

**Backend service (Implemented).** The signature service is constructed via `NewSignatureService(repo, custodianClient)` `Source: backend/internal/core/signature/service.go:L15`. It requires a reachable Custodian client and PostgreSQL/Redis per [Configuration](../getting-started/configuration.md).

**Backend route group (Implemented).** Signature routes are registered under `/signatures` with authentication middleware `Source: backend/internal/api/routes.go:L45-L51`:

```text
POST   /signatures/create
GET    /signatures/list
GET    /signatures/:id
```

There is no `/api/v1` prefix in the router `Source: backend/internal/api/routes.go:L9-L54`. See [Signatures API Reference](../api-reference/signatures.md) for schemas.

**Async status processor (Implemented interval; Designed adapters).** The processor uses a fixed polling interval defined as `const signatureCheckInterval = 5 * time.Minute` `Source: backend/internal/tasks/signature_processor.go:L13`, and is started via `StartSignatureProcessor(ctx, redisClient, sigService)` `Source: backend/internal/tasks/signature_processor.go:L15`. Unlike the transaction processor, this interval is a constant and does not panic.

## Usage

**Request a signature.** A client calls `POST /signatures/create`, which invokes `RequestSignature` and returns a record in `pending` status `Source: backend/internal/core/signature/service.go:L24-L38`. Fetch a single record with `GetSignature(id)` `Source: backend/internal/core/signature/service.go:L49`.

**Asynchronous status resolution.** Every polling interval the processor reads pending signatures and checks each one's status `Source: backend/internal/tasks/signature_processor.go:L33-L40` (list at L34, per-signature check at L40). When the custodian reports the signature is ready, the record is updated and cached in Redis under key `signature:<id>` with a 24-hour TTL `Source: backend/internal/tasks/signature_processor.go:L46-L52` (Ready branch at L46, update at L47, cache at L52). When the custodian reports failure, the record is updated to failed `Source: backend/internal/tasks/signature_processor.go:L55-L56`. This lifecycle is drawn as `Fig B3 - Signature Generation + Kafka Publish (Designed)` in [Data Flow](../architecture/data-flow.md).

The status vocabulary written by the backend is `pending` -> `Ready` / `Failed` `Source: backend/internal/core/signature/service.go:L30`, `Source: backend/internal/tasks/signature_processor.go:L46,L55`.

## Troubleshooting

**Signature UI page fails to load its actions (broken store slice).** The Signature Management page imports `requestSignature` and `checkSignatureStatus` from `@/store/signatureSlice` `Source: frontend/src/pages/SignatureManagement.tsx:L7`, but the Redux store registers only `vault`, `transaction`, and `user` reducers - there is no signature slice `Source: frontend/src/store/index.ts:L8-L12`. The import is unresolved (**Implemented defect**). Documented, not fixed; tracked in [Scaffold vs Design](../architecture/scaffold-vs-design.md).

**Undefined signature types in the page.** The page references `SignatureData` and `SignatureRequestData` types that are not defined `Source: frontend/src/pages/SignatureManagement.tsx:L14,L33`. These are **Implemented defects** that block compilation; documented, not fixed.

**API client method mismatch.** The page calls `api.getSignatures()` `Source: frontend/src/pages/SignatureManagement.tsx:L21,L38`, but the API client exports only `getSignatureStatus` for a single id and does not export `getSignatures` `Source: frontend/src/services/api.ts:L44`. Documented, not fixed.

**Signatures stay `pending`.** A signature only advances when the processor's poll observes a custodian status change `Source: backend/internal/core/signature/service.go:L66-L72`. If the Custodian client is unreachable, the record remains `pending`. Detection and remediation are documented as failure mode FM-3 in the [Runbook](../operations/runbook.md).

**Kafka publish does not occur.** Publishing completed signatures to Kafka is **Designed** (SG-001-4) and is absent from the processor `Source: backend/internal/tasks/signature_processor.go:L33-L57`; do not expect downstream Kafka events until this is implemented.

## Related documentation

- [Signatures API Reference](../api-reference/signatures.md) - endpoint contract for the five signature routes.
- [Data Flow](../architecture/data-flow.md) - `Fig B3 - Signature Generation + Kafka Publish (Designed)`.
- [Runbook](../operations/runbook.md) - FM-3 (signature poll) remediation.
- [Scaffold vs Design](../architecture/scaffold-vs-design.md) - broken signature-slice reconciliation.
- [Documentation index](../index.md).
