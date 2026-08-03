# Signature Management Guide

This guide covers the **Signature Generation and Management** feature (**SG-001**): how a signature request is *coded to* be created, how its status is *intended to* be polled asynchronously on a fixed interval until it reaches a ready or failed state, and the **Designed** publish-to-Kafka step. It also documents the known scaffold defects that prevent the signature flow from compiling or running today. Signatures are produced by the external Custodian, not by the application itself `Source: documentation/Software Requirements Specifications (SRS).md:§Glossary`.

For the endpoint contract, see [Signatures API Reference](../api-reference/signatures.md). For the generation sequence, see [Data Flow](../architecture/data-flow.md) (`Fig B3 - Signature Generation + Kafka Publish (Designed)`). Failure modes are catalogued in the [Runbook](../operations/runbook.md). This guide is linked from the [documentation index](../index.md).

> Maturity legend (identical to [Scaffold vs Design](../architecture/scaffold-vs-design.md)): **Implemented** = present in the repository AND compiles AND runs today; reserved, and nothing here qualifies at this checkpoint. **Source-present (non-buildable)** = code exists but does not compile today, so no runtime behavior may be asserted. **Provisioned** = configuration exists and would validly apply but is not wired. **Designed** = specified in the corpus but absent from the code today.

## Overview

Signature generation is coded as a request-then-poll lifecycle:

- **Request (source-present, non-buildable).** `RequestSignature(userID, vaultID, dataToSign)` is coded to create a signature record with status `pending`, persist it, then ask the custodian to sign `Source: backend/internal/core/signature/service.go:L24-L38` (status `pending` set at L30, persisted at L33, custodian call at L38). It does not compile: `repo` is typed `*db.Repository` (absent), the `custodian` package is absent, and the constructor writes a `DataToSign` field that the `db.Signature` model does not declare (see Build blockers).
- **Poll (source-present, non-buildable).** `CheckSignatureStatus(id uuid.UUID)` is coded to poll the custodian and update the record if the status changed `Source: backend/internal/core/signature/service.go:L55-L72` (poll at L61, conditional update at L66-L72). It depends on the same absent `db.Repository` and `custodian` packages, so no polling occurs today.
- **Publish to Kafka (Designed).** The SRS commits to publishing completed signatures to a Kafka topic (SG-001-4) `Source: documentation/Software Requirements Specifications (SRS).md:§Features`; this step is **not** present in the signature processor `Source: backend/internal/tasks/signature_processor.go:L33-L57` and is therefore Designed only.

| Stage | Operation | Status intended | Maturity |
|-------|-----------|-----------------|----------|
| Request | `RequestSignature` | `pending` | Source-present (non-buildable); repo/custodian absent, `DataToSign` field undeclared |
| Poll | `CheckSignatureStatus` (5-minute interval) | ready / failed | Source-present (non-buildable); repo/custodian absent |
| Publish | Kafka fan-out (SG-001-4) | - | Designed (absent from the processor) |

### SG-001 capability and status matrix

The SRS defines six SG-001 subrequirements `Source: documentation/Software Requirements Specifications (SRS).md:Section 1 (SG-001)`. Honest status against the current scaffold:

| SG-001 subrequirement | SRS intent | Delivery surface (source) | Status |
|-----------------------|-----------|---------------------------|--------|
| SG-001-1 Request Signature | Initiate a signature request for a vault | `RequestSignature`; `SignatureRequest` component | Source-present (non-buildable) |
| SG-001-2 Check Signature Status | Real-time status updates | `CheckSignatureStatus`; async processor | Source-present (non-buildable); no real-time channel wired |
| SG-001-3 View Completed Signatures | List completed signatures per vault | `GetSignature`; `GET /signatures/list` route | Source-present (non-buildable); routed handler undefined |
| SG-001-4 Publish Signature | Auto-publish completed signatures to Kafka | none | Designed (absent from the processor) |
| SG-001-5 Signature History | Maintain/display request-and-outcome history | none | Designed (no history endpoint or store) |
| SG-001-6 Signature Analytics | Generation times and success rates | none | Designed (not present in code) |

Only SG-001-1 through SG-001-3 have any source; SG-001-4 (Kafka publish), SG-001-5 (history), and SG-001-6 (analytics) are entirely Designed. None runs today because the backend and SPA do not compile.

### Build blockers (read first)

Signature management does not run today. Resolve these before any runtime behavior below applies (all documented, none fixed):

1. **No `go.mod`.** The backend is not a Go module.
2. **`db.Repository` absent.** `SignatureService.repo` is `*db.Repository`, and `CreateSignature`, `GetSignatureByID`, and `UpdateSignature` all target it `Source: backend/internal/core/signature/service.go:L11,L33,L50,L56,L68`.
3. **`custodian` and `pkg/utils` packages absent.** The service imports `backend/internal/custodian` and `backend/pkg/utils`, and the handler imports `backend/pkg/utils`; none of these packages exist `Source: backend/internal/core/signature/service.go:L6-L7`, `Source: backend/internal/api/handlers/signature.go:L6`.
4. **Model gap.** `RequestSignature` sets a `DataToSign` field, but the `db.Signature` model declares only `Status`, `RawSignature`, and `Metadata` (no `DataToSign`) `Source: backend/internal/core/signature/service.go:L29`, `Source: backend/internal/db/schema.go:L58-L68`.
5. **Handler/service method gaps.** The handler calls `signatureService.GetRawSignature(...)`, a method the service does not define, and passes a `string` id into `CheckSignatureStatus`, which expects a `uuid.UUID` `Source: backend/internal/api/handlers/signature.go:L31,L43,L49`, `Source: backend/internal/core/signature/service.go:L55`.
6. **Router/handler mismatch.** The router wires `SignatureHandler.CreateSignature`, `ListSignatures`, `GetSignature`, `UpdateSignature`, and `DeleteSignature`, but the handler defines only `GetRawSignature` and `CheckSignatureStatus`, so all five routed methods are undefined and the `api` package does not compile `Source: backend/internal/api/routes.go:L47-L51`, `Source: backend/internal/api/handlers/signature.go:L21,L42`.
7. **Processor gaps.** The processor imports the absent `backend/pkg/logger`, calls `db.GetPendingSignatures`/`db.UpdateSignature` (undefined), references undefined `signature.StatusReady`/`signature.StatusFailed` constants, and calls `CheckSignatureStatus(ctx, sig.ID)` (two arguments) against a one-argument service method `Source: backend/internal/tasks/signature_processor.go:L10,L34,L40,L46,L47,L55,L56`.
8. **Frontend thunk/slice/hooks.** The page imports typed hooks the store does not export and a `signatureSlice` that must be built, references undefined `SignatureData`/`SignatureRequestData` types, and calls `api.getSignatures()`, which the API client does not export (see Troubleshooting).

## Setup

**Backend service (source-present, non-buildable).** The signature service is coded to be constructed via `NewSignatureService(repo, custodianClient)` `Source: backend/internal/core/signature/service.go:L15`, but the `*db.Repository` and `custodian.CustodianClient` types are absent (Build blockers 2-3), so the service does not compile. Configure a reachable Custodian client and PostgreSQL/Redis per [Configuration](../getting-started/configuration.md) as the designed setup.

**Backend route group (source-present).** Signature routes are declared under `/signatures` with authentication middleware attached in source `Source: backend/internal/api/routes.go:L45-L51`; the group wires handler methods that are not defined (Build blocker 6), so the `api` package does not compile and no route is served today:

```text
POST   /signatures/create
GET    /signatures/list
GET    /signatures/:id
PUT    /signatures/:id
DELETE /signatures/:id
```

There is no `/api/v1` prefix in the router `Source: backend/internal/api/routes.go:L9-L54`. See [Signatures API Reference](../api-reference/signatures.md) for schemas.

**Async status processor (source-present, non-buildable).** The processor declares a fixed polling interval as `const signatureCheckInterval = 5 * time.Minute` `Source: backend/internal/tasks/signature_processor.go:L13`, and is started via `StartSignatureProcessor(ctx, redisClient, sigService)` `Source: backend/internal/tasks/signature_processor.go:L15`. Unlike the transaction processor, this interval constant is validly positive in source, so were the package to compile the ticker would not panic on a zero interval; however the processor still does not build (Build blocker 7: absent logger, undefined `db` functions and `signature.Status*` constants, and a two-argument call into the one-argument `CheckSignatureStatus`), so no polling runs today.

## Usage

The behavior below is the **designed** signature flow. Because the backend and SPA do not compile (Build blockers), none of it runs at this checkpoint; the steps describe what the source is coded to do once the blockers are resolved.

**Request a signature.** A client is intended to call `POST /signatures/create`, which is coded to invoke `RequestSignature` and return a record in `pending` status `Source: backend/internal/core/signature/service.go:L24-L38`. A single record is coded to be fetched with `GetSignature(id)` `Source: backend/internal/core/signature/service.go:L49`.

**Asynchronous status resolution (designed).** Each polling interval the processor is coded to read pending signatures and check each one's status `Source: backend/internal/tasks/signature_processor.go:L33-L40` (list at L34, per-signature check at L40). On a ready result the record is coded to be updated and cached in Redis under key `signature:<id>` with a 24-hour TTL `Source: backend/internal/tasks/signature_processor.go:L46-L52` (ready branch at L46, update at L47, cache at L52); on a failure result the record is coded to be updated to failed `Source: backend/internal/tasks/signature_processor.go:L55-L56`. Both branches key off `signature.StatusReady`/`signature.StatusFailed`, which are undefined constants (Build blocker 7), so this lifecycle is Designed. It is drawn as `Fig B3 - Signature Generation + Kafka Publish (Designed)` in [Data Flow](../architecture/data-flow.md).

> **Sensitive material — raw signature handling (Designed contract).** The object cached under `signature:<id>` is the full `Signature` record, which includes `RawSignature` — **sensitive cryptographic material**. `Source: backend/internal/tasks/signature_processor.go:L52`, `Source: backend/internal/db/schema.go:L64`. The intended handling is a **Designed** contract, not a runtime guarantee: classify `RawSignature` explicitly as sensitive; **minimize retention** (keep the 24-hour Redis TTL as short as the workflow allows — it is an exposure window, made worse because the designed ElastiCache declares no at-rest or in-transit encryption, see the [deployment guide](deployment.md)); **encrypt** it in transit and at rest; and **never** log it (a structured logger must exclude it, per the [observability logging allowlist](../operations/observability.md#logging-allowlist-and-redaction-contract-designed)). The consolidated classification lives in [`../architecture/data-model.md`](../architecture/data-model.md#sensitive--secret-fields), with matching notes in the [signatures API reference](../api-reference/signatures.md) and the [security model](../security/security-model.md#secrets-and-key-management).

The status vocabulary the service is coded to write is `pending` at request time `Source: backend/internal/core/signature/service.go:L30`, transitioning toward ready/failed values the processor references through the undefined `signature.StatusReady`/`signature.StatusFailed` constants `Source: backend/internal/tasks/signature_processor.go:L46,L55`; the concrete ready/failed strings are therefore Designed, not compiled.

## Troubleshooting

**Signature UI page fails to load its actions (broken store slice).** The Signature Management page imports `requestSignature` and `checkSignatureStatus` from `@/store/signatureSlice` `Source: frontend/src/pages/SignatureManagement.tsx:L7`, but the Redux store registers only `vault`, `transaction`, and `user` reducers - there is no signature slice `Source: frontend/src/store/index.ts:L8-L12`. The import is unresolved (**source-present defect**). Documented, not fixed; tracked in [Scaffold vs Design](../architecture/scaffold-vs-design.md).

**Typed hooks not exported.** The page imports `useAppSelector` and `useAppDispatch` from `@/store` `Source: frontend/src/pages/SignatureManagement.tsx:L6`, but the store exports only `store`, `RootState`, and `AppDispatch` - the typed hooks are not defined `Source: frontend/src/store/index.ts:L19-L22`. This **source-present defect** blocks compilation; documented, not fixed.

**Undefined signature types in the page.** The page references `SignatureData` and `SignatureRequestData` types that are not defined `Source: frontend/src/pages/SignatureManagement.tsx:L14,L33`. These are **source-present defects** that block compilation; documented, not fixed.

**API client method mismatch.** The page calls `api.getSignatures()` `Source: frontend/src/pages/SignatureManagement.tsx:L21,L38`, but the API client exports only `getSignatureStatus` for a single id and does not export `getSignatures` `Source: frontend/src/services/api.ts:L44`. Documented, not fixed.

**Signatures would stay `pending` (designed behavior).** In the designed flow a signature only advances when the processor's poll observes a custodian status change `Source: backend/internal/core/signature/service.go:L66-L72`; if the Custodian client were unreachable, the record would remain `pending`. Today no poll runs at all because the processor package does not compile (Build blocker 7), so every request would remain `pending` regardless of custodian reachability. Detection and remediation of the stalled-poll condition are documented as failure mode FM-3 in the [Runbook](../operations/runbook.md).

**Kafka publish does not occur.** Publishing completed signatures to Kafka is **Designed** (SG-001-4) and is absent from the processor `Source: backend/internal/tasks/signature_processor.go:L33-L57`; do not expect downstream Kafka events until this is implemented.

## Related documentation

- [Signatures API Reference](../api-reference/signatures.md) - endpoint contract for the five signature routes.
- [Data Flow](../architecture/data-flow.md) - `Fig B3 - Signature Generation + Kafka Publish (Designed)`.
- [Runbook](../operations/runbook.md) - FM-3 (signature poll) remediation.
- [Scaffold vs Design](../architecture/scaffold-vs-design.md) - broken signature-slice reconciliation.
- [Documentation index](../index.md).
