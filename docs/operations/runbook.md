# Operations Runbook

This runbook catalogs the alerts and failure modes for the **Blockchain Integration Service and Dashboard** backend and gives, for each, a **Detection → Diagnosis → Remediation** procedure. Consistent with the documentation-only scope, remediations are **documented, not applied** — no source code is changed by this deliverable, and known defects are recorded honestly rather than fixed.

Maturity tags follow the project convention (identical to [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md)): **Implemented** (present AND compiles AND runs today — reserved, and nothing here qualifies at this checkpoint), **Source-present (non-buildable)** (the code exists but does not compile, so no runtime behavior may be asserted), **Provisioned** (infrastructure exists and would validly apply, but is not wired), **Designed** (specified but absent today). The one signal genuinely observable today is the **build failure itself**. See [`observability.md`](observability.md) for the signal inventory (`Fig O1`) and [`dashboard-template.json`](dashboard-template.json) for the panels referenced below.

## Alert catalog

| Alert | Trigger condition | Maturity of signal | Failure mode |
|-------|-------------------|--------------------|--------------|
| Backend startup panic (latent, post-build) | Would panic when the ticker is constructed, once the module builds; not reproducible today | Latent (present in code; not observable today — the image build fails first, see FM-4) | FM-1 Uninitialized ticker panic |
| Settlement lag rising | Max pending-transaction age exceeds **300 s** — the red threshold on the settlement-lag panel (`id: 9`) in [`dashboard-template.json`](dashboard-template.json), a **Designed placeholder** borrowed from the signature processor's `5 * time.Minute` constant because no cadence can be derived from the transaction processor `Source: backend/internal/tasks/signature_processor.go:L13`, `Source: backend/internal/tasks/transaction_processor.go:L13-L16` | Designed (needs `/metrics`) | FM-2 Settlement retry behavior |
| Signature poll stalled | Last-successful-poll signal exceeds two intervals | Designed (no per-poll success log/metric exists today) | FM-3 Signature processor poll |
| Build/boot failure | Compilation or wiring error before serving | Observable today (build failure) | FM-4 Processor & router wiring mismatch |
| Running container never becomes ready | Readiness probe fails or is absent while the process stays up | Designed (needs `/ready` + HEALTHCHECK) | FM-5 Container health-check gap |

## FM-1 — Uninitialized ticker panic at startup

**Maturity:** Latent runtime defect — present in code, but **not reproducible today** because the backend module does not compile: there is no `go.mod`, and `pkg/logger`, `internal/config`, `internal/blockchain`, and `internal/custodian` are imported but absent `Source: backend/cmd/server/main.go:L10` (see FM-4). The panic is therefore reachable only **after** the FM-4 compile blockers are resolved, consistent with the source-of-truth reconciliation in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md) (Defect #2: a *latent* runtime crash, "only reachable once those compile-blocking defects are resolved").

**Detection.** Today the observable symptom is a **build/image-build failure**, not a running-container crash-loop: the backend is not a Go module and does not compile, and the backend image build fails at `COPY go.mod go.sum ./` `Source: infrastructure/docker/Dockerfile.backend:L8` before any container can start (see FM-4). No process launches, so the ticker panic is not observable yet. **Once the FM-4 compile blockers are resolved**, this defect would surface as a startup panic in the transaction processor that exits the process before any HTTP port begins serving.

**Diagnosis.** `transactionCheckInterval` is declared but never assigned, so it holds the zero value `0` `Source: backend/internal/tasks/transaction_processor.go:L13-L16`. Passing `0` to `time.NewTicker(0)` panics (`non-positive interval for NewTicker`). Contrast the signature processor, which is correct: it uses a positive constant `const signatureCheckInterval = 5 * time.Minute` `Source: backend/internal/tasks/signature_processor.go:L13`.

**Remediation (documented, not applied).** Initialize the interval to a positive duration (for example a configured value) before constructing the ticker, mirroring the signature processor's constant. This is a documented defect; no code change is made by this deliverable.

## FM-2 — Settlement retry behavior (no backoff)

**Maturity:** Source-present (non-buildable) behavior as-written; Designed dependencies absent.

**Detection (Designed — signal does not exist today).** Transactions stay in status `Pending` and settlement lag climbs on the settlement-lag panel `id: 9` in [`dashboard-template.json`](dashboard-template.json), which alerts when the maximum pending age exceeds its red threshold of **300 s**. That panel resolves to no data at this checkpoint because `blockchain_transaction_pending_age_seconds` is emitted by nothing — there is no `/metrics` endpoint or exporter `Source: backend/internal/api/routes.go:L9-L54`. The 300-second value is a **Designed placeholder**: it is borrowed from the signature processor's `const signatureCheckInterval = 5 * time.Minute` `Source: backend/internal/tasks/signature_processor.go:L13` precisely because `transactionCheckInterval` is uninitialized and yields no cadence of its own `Source: backend/internal/tasks/transaction_processor.go:L13-L16`, so it must be re-derived from the real settlement cadence once that interval is set.

**Diagnosis.** The processor loop logs per-transaction errors via `logger.Error(...)` and then `continue`s to the next item; there is **no** explicit retry counter or exponential backoff `Source: backend/internal/tasks/transaction_processor.go:L44,L50,L57`. A transaction that errors is left `Pending` and is retried implicitly on the next ticker tick (retry-on-next-poll). Successful settlement transitions a transaction `Pending -> Processed` `Source: backend/internal/core/transaction/service.go:L46,L81`. Note this cannot execute today because the backend does not compile (FM-4); even after it builds, the transaction processor would still hit the latent ticker panic (FM-1), and the blockchain/custodian adapters are absent.

**Remediation (documented, not applied).** After FM-1 is resolved, add a bounded retry with backoff and a dead-letter path for repeatedly failing transactions, and emit a settlement-lag metric to drive the alert. Documented only.

## FM-3 — Signature processor poll interval

**Maturity:** Designed detection. The `logger.Error(...)` call sites are source-present but non-buildable (they depend on the absent `pkg/logger`), and there is **no per-poll success or heartbeat log** to observe in the first place.

**Detection (Designed — signal does not exist today).** The intuitive check "no signature-processing log line within two poll intervals" **cannot work as written**: the signature processor only calls `logger.Error(...)` on its *error* paths `Source: backend/internal/tasks/signature_processor.go:L25,L42,L48,L53,L57` — it emits nothing on a successful poll, so the absence of a log line is indistinguishable from a healthy idle poll. There is therefore no heartbeat to alert on. Detection requires a **Designed** "last successful poll" metric/log (a `signature_last_success_timestamp` gauge, or an explicit per-poll info log) that does not exist today; alert when that signal exceeds two intervals. Even the error-path logs emit nothing at present because `pkg/logger` is absent and the module does not compile `Source: backend/internal/tasks/signature_processor.go:L10`.

**Diagnosis.** The signature processor is coded to poll on a fixed five-minute ticker `Source: backend/internal/tasks/signature_processor.go:L13`; its only logging is `logger.Error(...)` on error branches `Source: backend/internal/tasks/signature_processor.go:L25,L42,L48,L53,L57`, with no success/heartbeat emission. Once the compile blockers (FM-4) and the missing success signal are addressed, a stalled poll would indicate the worker goroutine exited or the process is down (see FM-1/FM-4).

**Remediation (documented, not applied).** Add a "last successful poll" timestamp metric (or an explicit per-poll info log) and alert when it exceeds two intervals; this Designed signal is the prerequisite for the detection above. Documented only.

## FM-4 — Processor and router wiring mismatch (does not build)

**Maturity:** Source-present defect (blocks build/boot; observable today as a build failure).

**Detection.** The service fails to build or to wire dependencies before it can serve requests.

**Diagnosis.** The composition root calls `api.SetupRouter(...)` with four arguments `Source: backend/cmd/server/main.go:L52`, but the router defines `func SetupRouter() *gin.Engine` with none `Source: backend/internal/api/routes.go:L9`. The processors are likewise started with mismatched arguments `Source: backend/cmd/server/main.go:L55-L56`. There is no `go.mod`, and `pkg/logger`, `internal/config`, `internal/blockchain`, and `internal/custodian` are imported but absent `Source: backend/cmd/server/main.go:L10`.

**Remediation (documented, not applied).** Reconcile the `SetupRouter` and processor signatures between caller and callee, add the absent packages, and introduce a `go.mod`. These are documented scaffold gaps; no code change is made here. See [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## FM-5 — Container health-check gap

**Maturity:** Designed (absent today).

**Detection.** Distinguish two cases. (1) A process that **panics or exits** — such as the FM-1 ticker panic — terminates its container; the orchestrator observes the non-zero exit and restarts/backs off the container, so an exited process is **not** reported healthy. (2) The uncovered gap is a container that **stays running but is degraded** — for example, the HTTP server is up but a dependency (PostgreSQL/Redis) is unreachable, or a background worker goroutine has died while the process lives. With **no** `HEALTHCHECK` and no readiness endpoint, the orchestrator has no signal for case (2) and keeps routing traffic to a running-but-not-ready container. Stated positively: a panic exits the process, so the container is restarted rather than reported healthy; the uncovered gap is that a **running-but-unready** container is indistinguishable from a healthy one until `/ready` and a Dockerfile `HEALTHCHECK` exist.

**Diagnosis.** Neither Dockerfile declares a `HEALTHCHECK`; the backend image only exposes its port `Source: infrastructure/docker/Dockerfile.backend:L20`, and the frontend image likewise `Source: infrastructure/docker/Dockerfile.frontend:L26`. There are also no `/health` or `/ready` routes for a check to target `Source: backend/internal/api/routes.go:L9-L54`. Consequently the orchestrator can detect only whole-process exit (case 1), not running-but-degraded state (case 2).

**Remediation (documented, not applied).** Add `/health` and `/ready` endpoints (readiness composing `db.Ping()` `Source: backend/internal/db/postgres.go:L27` and `redisClient.Ping(ctx)` `Source: backend/internal/db/redis.go:L21`) and a Dockerfile `HEALTHCHECK` targeting them. **Pair them with graceful shutdown and traffic drain (Designed), or the readiness endpoint solves only half the problem:** a `/ready` probe that never turns negative gives the ALB target group no window to deregister, so every deployment still drops in-flight requests even after the endpoints and `HEALTHCHECK` ship. The designed sequence on `SIGTERM` is — fail `/ready` first, wait for the load balancer to deregister, stop accepting new connections, then drain in-flight requests and the processors' current iteration via `http.Server.Shutdown` with a bounded timeout and cancellation of the processors' context. Neither piece exists today: the composition root installs no signal handler and calls no `Shutdown`, and the repository's own marker records the gap (`// HUMAN ASSISTANCE NEEDED` / `// The following code may need additional error handling and graceful shutdown mechanisms`) `Source: backend/cmd/server/main.go:L18-L19`. Documented only; see [`observability.md`](observability.md) Pillar 4.

## Related documentation

- [`observability.md`](observability.md) — the five observability pillars and `Fig O1` (current vs designed).
- [`dashboard-template.json`](dashboard-template.json) — dashboard panels referenced by these alerts.
- [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md) — full maturity matrix reconciling scaffold versus design.
- [`../index.md`](../index.md) — documentation landing page.
