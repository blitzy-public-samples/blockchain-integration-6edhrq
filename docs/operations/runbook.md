# Operations Runbook

This runbook catalogs the alerts and failure modes for the **Blockchain Integration Service and Dashboard** backend and gives, for each, a **Detection → Diagnosis → Remediation** procedure. Consistent with the documentation-only scope, remediations are **documented, not applied** — no source code is changed by this deliverable, and known defects are recorded honestly rather than fixed.

Maturity tags follow the project convention: **Implemented** (present in code today), **Provisioned** (infrastructure exists, not wired), **Designed** (specified but absent today). See [`observability.md`](observability.md) for the signal inventory (`Fig O1`) and [`dashboard-template.json`](dashboard-template.json) for the panels referenced below.

## Alert catalog

| Alert | Trigger condition | Maturity of signal | Failure mode |
|-------|-------------------|--------------------|--------------|
| Backend crash-loop on startup | Process exits immediately after launch | Implemented (observable via container restarts) | FM-1 Uninitialized ticker panic |
| Settlement lag rising | Transactions remain `Pending` beyond threshold | Designed (needs `/metrics`) | FM-2 Settlement retry behavior |
| Signature poll stalled | No signature poll log within two intervals | Implemented emission / Designed metric | FM-3 Signature processor poll |
| Build/boot failure | Compilation or wiring error before serving | Implemented (build output) | FM-4 Processor & router wiring mismatch |
| Container reported healthy while broken | Orchestrator lacks health signal | Designed (needs HEALTHCHECK) | FM-5 Container health-check gap |

## FM-1 — Uninitialized ticker panic at startup

**Maturity:** Implemented defect (reproducible today).

**Detection.** The backend process panics during startup and the container enters a crash-loop; no HTTP port begins serving. The panic originates in the transaction processor.

**Diagnosis.** `transactionCheckInterval` is declared but never assigned, so it holds the zero value `0` `Source: backend/internal/tasks/transaction_processor.go:L13-L16`. Passing `0` to `time.NewTicker(0)` panics (`non-positive interval for NewTicker`). Contrast the signature processor, which is correct: it uses a positive constant `const signatureCheckInterval = 5 * time.Minute` `Source: backend/internal/tasks/signature_processor.go:L13`.

**Remediation (documented, not applied).** Initialize the interval to a positive duration (for example a configured value) before constructing the ticker, mirroring the signature processor's constant. This is a documented defect; no code change is made by this deliverable.

## FM-2 — Settlement retry behavior (no backoff)

**Maturity:** Implemented behavior (as-written), with Designed dependencies absent.

**Detection.** Transactions stay in status `Pending` and settlement lag climbs on the [`dashboard-template.json`](dashboard-template.json) settlement-lag panel (a Designed metric).

**Diagnosis.** The processor loop logs per-transaction errors via `logger.Error(...)` and then `continue`s to the next item; there is **no** explicit retry counter or exponential backoff `Source: backend/internal/tasks/transaction_processor.go:L44,L50,L57`. A transaction that errors is left `Pending` and is retried implicitly on the next ticker tick (retry-on-next-poll). Successful settlement transitions a transaction `Pending -> Processed` `Source: backend/internal/core/transaction/service.go:L46,L81`. Note this cannot execute today because of FM-1, and the blockchain/custodian adapters are absent.

**Remediation (documented, not applied).** After FM-1 is resolved, add a bounded retry with backoff and a dead-letter path for repeatedly failing transactions, and emit a settlement-lag metric to drive the alert. Documented only.

## FM-3 — Signature processor poll interval

**Maturity:** Implemented (emission-only) / Designed metric.

**Detection.** No signature-processing log line appears within two poll intervals, or the signature-poll-interval stat on [`dashboard-template.json`](dashboard-template.json) is stale.

**Diagnosis.** The signature processor polls on a fixed five-minute ticker `Source: backend/internal/tasks/signature_processor.go:L13`, emitting structured errors via `logger.Error(...)` `Source: backend/internal/tasks/signature_processor.go:L25,L42,L48,L53,L57`. A stalled poll indicates the worker goroutine exited or the process is down (see FM-1/FM-4).

**Remediation (documented, not applied).** Emit a "last successful poll" timestamp metric and alert when it exceeds two intervals. Documented only.

## FM-4 — Processor and router wiring mismatch (does not build)

**Maturity:** Implemented defect (blocks build/boot).

**Detection.** The service fails to build or to wire dependencies before it can serve requests.

**Diagnosis.** The composition root calls `api.SetupRouter(...)` with four arguments `Source: backend/cmd/server/main.go:L52`, but the router defines `func SetupRouter() *gin.Engine` with none `Source: backend/internal/api/routes.go:L9`. The processors are likewise started with mismatched arguments `Source: backend/cmd/server/main.go:L55-L56`. There is no `go.mod`, and `pkg/logger`, `internal/config`, `internal/blockchain`, and `internal/custodian` are imported but absent `Source: backend/cmd/server/main.go:L10`.

**Remediation (documented, not applied).** Reconcile the `SetupRouter` and processor signatures between caller and callee, add the absent packages, and introduce a `go.mod`. These are documented scaffold gaps; no code change is made here. See [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## FM-5 — Container health-check gap

**Maturity:** Designed (absent today).

**Detection.** The orchestrator reports a container as healthy even when the process has panicked (FM-1), because no health signal is defined.

**Diagnosis.** Neither Dockerfile declares a `HEALTHCHECK`; the backend image only exposes its port `Source: infrastructure/docker/Dockerfile.backend:L20`, and the frontend image likewise `Source: infrastructure/docker/Dockerfile.frontend:L26`. There are also no `/health` or `/ready` routes for a check to target `Source: backend/internal/api/routes.go:L9-L54`.

**Remediation (documented, not applied).** Add `/health` and `/ready` endpoints (readiness composing `db.Ping()` `Source: backend/internal/db/postgres.go:L27` and `redisClient.Ping(ctx)` `Source: backend/internal/db/redis.go:L21`) and a Dockerfile `HEALTHCHECK` targeting them. Documented only; see [`observability.md`](observability.md) Pillar 4.

## Related documentation

- [`observability.md`](observability.md) — the five observability pillars and `Fig O1` (current vs designed).
- [`dashboard-template.json`](dashboard-template.json) — dashboard panels referenced by these alerts.
- [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md) — full maturity matrix reconciling scaffold versus design.
- [`../index.md`](../index.md) — documentation landing page.
