# Observability

This guide documents observability for the **Blockchain Integration Service and Dashboard** across the five required pillars: structured logging with correlation IDs, distributed tracing, a metrics endpoint, health/readiness checks, and a dashboard template. It satisfies the mandatory Observability rule.

Following the rule's discipline, each pillar first states **what source-present signal it reuses** (labeled **Source-present (non-buildable)** — the call site exists in the repository but does not compile today) and then **what is added** (labeled **Designed** where the capability is absent today). Every technical claim carries a `Source:` citation. `Fig O1 — Observability Current vs Designed` shows both states so the gap is explicit.

> Maturity legend (identical to [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md)): **Implemented** = present in the repository AND compiles AND runs today; this label is **reserved** and nothing in this repository qualifies at this checkpoint, so it is not used below. **Source-present (non-buildable)** = the code for the signal exists in the repository but does not compile today (no `go.mod`; `pkg/logger` and other packages are imported but absent), so no runtime emission, format, or destination may be asserted. **Provisioned** = configuration/scaffold exists and would validly apply but is not wired into a running system. **Designed** = specified in the corpus but absent from the code today.

## Fig O1 — Observability Current vs Designed

`Fig O1` is a before/after pair. The **Current (source-present, non-buildable)** subgraph shows only the logging *call sites* that exist in the source today — none of which emit at runtime, because the backend does not compile; the **Designed (target)** subgraph shows the added correlation IDs, tracing, metrics, health/readiness, aggregation, and alerting. The dashed node marks the compile-blocking caveat that `pkg/logger` is imported but absent.

```mermaid
flowchart LR
    subgraph Legend_O1["Legend"]
        LG1["Solid box = source-present call site (non-buildable; no emission today)"]
        LG2["Dashed box = imported but ABSENT (does not compile)"]
        LG3["Rounded box = Designed / added (absent today)"]
    end

    subgraph Current["Current - Source-present (non-buildable; no emission today)"]
        direction TB
        C_API["Gin router: gin.Logger()+gin.Recovery() call sites (api pkg non-buildable)"]
        C_WORK["Task workers: logger.Error(...) call sites (need ABSENT pkg/logger)"]
        C_FE["Frontend: console.* call sites (SPA non-buildable)"]
        C_PING["Liveness primitives: db.Ping() + redisClient.Ping(ctx)"]
        C_LOGGER["pkg/logger (imported, ABSENT)"]
        C_STDOUT["stdout / container logs (intended sink; nothing emits today)"]
        C_API -.->|"intended (does not run today)"| C_STDOUT
        C_WORK -.->|"intended (does not run today)"| C_STDOUT
        C_WORK -.->|"depends on"| C_LOGGER
    end

    subgraph Designed["Designed - Target (added, absent today)"]
        direction TB
        D_MW(["Correlation-ID middleware (request_id propagation)"])
        D_TRACE(["OpenTelemetry distributed tracing across service boundaries"])
        D_METRICS(["/metrics endpoint (Prometheus)"])
        D_HEALTH(["/health + /ready endpoints + Dockerfile HEALTHCHECK"])
        D_AGG(["Log aggregation (CloudWatch / Loki)"])
        D_ALERT(["Alerting on error rate, settlement lag, health"])
        D_DASH(["Dashboard: dashboard-template.json"])
        D_MW --> D_AGG
        D_TRACE --> D_DASH
        D_METRICS --> D_DASH
        D_HEALTH --> D_ALERT
        D_AGG --> D_DASH
        D_DASH --> D_ALERT
    end

    Current ==>|"gaps closed by design"| Designed
```

**Figure O1 legend.** Solid boxes are source-present logging call sites — they exist in the source but emit nothing today because the backend does not compile (dashed intended-emission arrows carry the "does not run today" qualifier); the dashed box (`pkg/logger`) is imported but absent, so even the source-present worker logging cannot compile; rounded boxes are Designed additions absent today. The heavy arrow marks the transition from the current source-present (non-buildable) state to the designed target.

Sources for `Fig O1`: `Source: backend/internal/api/routes.go:L13-L14` (Gin logging/recovery), `Source: backend/internal/tasks/transaction_processor.go:L26,L44,L50,L57` and `Source: backend/internal/tasks/signature_processor.go:L25,L42,L48,L53,L57` (worker logs), `Source: backend/cmd/server/main.go:L10` (`pkg/logger` imported but absent), `Source: backend/internal/db/postgres.go:L27` and `Source: backend/internal/db/redis.go:L21` (liveness primitives).

## Pillar 1 — Structured logging with correlation IDs

**Reused (source-present, non-buildable).** The Gin router contains `gin.Logger()` and `gin.Recovery()` middleware *call sites* `Source: backend/internal/api/routes.go:L13-L14`. These would emit an access log line per request and recover from panics *if the code ran*, but the `api` package does not compile today — it imports the absent `internal/api/middleware` package `Source: backend/internal/api/routes.go:L6` and references handler methods that are not defined — so no access log is emitted and the on-disk log format and destination cannot be verified. Both background processors likewise contain `logger.Error(...)` call sites on their error paths only `Source: backend/internal/tasks/transaction_processor.go:L26,L44,L50,L57`, `Source: backend/internal/tasks/signature_processor.go:L25,L42,L48,L53,L57`; these call the **absent** `backend/pkg/logger` package `Source: backend/internal/tasks/transaction_processor.go:L10`, so they do not compile and emit nothing today, and there is no success/heartbeat log on the non-error path. The frontend contains `console.*` call sites (no structured logger), but the SPA also does not build. The design intent for a structured backend logger is Logrus `Source: documentation/Technical Specifications.md:§FRAMEWORKS AND LIBRARIES`. In short: the logging *call sites* are source-present, but no log line — structured or otherwise — is emitted to stdout or anywhere else at this checkpoint.

**Added (Designed).** Correlation-ID propagation does not exist today: no middleware assigns or forwards a `request_id`/`X-Request-ID`, so logs cannot be correlated across the router and workers. **Caveat:** `pkg/logger` is imported by the composition root and both processors but the package directory is absent `Source: backend/cmd/server/main.go:L10`, so even the source-present worker logging cannot compile until the package exists. The design adds a correlation-ID middleware and a shared structured logger.

**Local verification (static only today).** Because the backend does not compile (see [`runbook.md`](runbook.md) FM-4), there is no running API to exercise and no stdout log line to observe at this checkpoint; runtime verification is gated on resolving those compile blockers. What is verifiable statically today: `grep -n "gin.Logger()\|gin.Recovery()" backend/internal/api/routes.go` confirms the middleware call sites exist in source, and `grep -rn "logger.Error" backend/internal/tasks` confirms the worker call sites exist in source. `grep -rn "\"backend/pkg/logger\"" backend` shows the import while `ls backend/pkg/logger` returns no such directory, confirming the logging package is absent. Once the compile blockers are resolved, the runtime check is: start the API, issue a request, and observe the access line on stdout.

## Pillar 2 — Distributed tracing

**Reused (source-present).** None. There is no tracing instrumentation in the codebase today.

**Added (Designed).** OpenTelemetry tracing spanning the HTTP handler, the core service, and the custodian/blockchain adapters, so a transaction or signature can be followed across service boundaries. Trace error rate is surfaced by a Designed panel in `dashboard-template.json`.

**Local verification.** `grep -rn "otel\|opentelemetry\|trace" backend` returns no matches today, confirming tracing is absent (Designed).

## Pillar 3 — Metrics endpoint

**Reused (source-present).** None. The router registers only the `/auth`, `/vault`, `/transactions`, and `/signatures` groups and defines no `/metrics` route `Source: backend/internal/api/routes.go:L9-L54`.

**Added (Designed).** A Prometheus `/metrics` endpoint exporting request counters, request-duration histograms (for p95 latency), and worker/settlement gauges. CloudWatch is the design's monitoring backend `Source: documentation/Technical Specifications.md:§THIRD-PARTY SERVICES`. The capacity target the metrics validate is ~10,000 req/s `Source: documentation/Technical Specifications.md:§SYSTEM OVERVIEW`.

**Local verification.** `grep -n "metrics" backend/internal/api/routes.go` returns nothing, confirming no metrics route (Designed).

## Pillar 4 — Health and readiness checks

**Reused (source-present).** No `/health` or `/ready` HTTP routes exist `Source: backend/internal/api/routes.go:L9-L54`. However, source-present liveness primitives exist to build on: PostgreSQL connectivity is checked in source with `db.Ping()` `Source: backend/internal/db/postgres.go:L27`, and Redis connectivity with `redisClient.Ping(ctx)` `Source: backend/internal/db/redis.go:L21`. These run inside the connection initializers rather than an HTTP probe and, like the rest of the backend, do not execute today because the module does not compile.

**Added (Designed).** A liveness `/health` endpoint and a readiness `/ready` endpoint that composes the PostgreSQL and Redis pings, plus a container-level `HEALTHCHECK`. The backend Dockerfile only exposes a port and defines no `HEALTHCHECK` `Source: infrastructure/docker/Dockerfile.backend:L20`; the frontend Dockerfile has the same gap `Source: infrastructure/docker/Dockerfile.frontend:L26`.

**Local verification.** `grep -n "health\|ready" backend/internal/api/routes.go` returns nothing (Designed). `grep -n "HEALTHCHECK" infrastructure/docker/Dockerfile.backend infrastructure/docker/Dockerfile.frontend` returns nothing, confirming the container health-check gap.

## Pillar 5 — Dashboard template

**Reused (source-present).** None committed.

**Added (Designed).** A Grafana-compatible dashboard template ships with this documentation at [`dashboard-template.json`](dashboard-template.json). It contains health/readiness stat panels, request-rate and p95-latency time series, a worker-error log panel (bound to the source-present `logger.Error(...)` call sites, which depend on the absent `pkg/logger` and therefore emit nothing today — non-buildable, not a live signal), a settlement-lag time series, a signature-poll-interval stat, and a trace-error-rate panel. Every panel is maturity-labeled and cited; because the backend does not compile, **no panel binds to a signal that is emitted today** — every panel is either **Designed** (absent capability) or bound to a **source-present (non-buildable)** call site.

**Local verification.** `python3 -c "import json; d=json.load(open('docs/operations/dashboard-template.json')); print(len(d['panels']))"` prints `11` and confirms the template is valid JSON.

## Monitoring & Analytics (MA-001)

This is the canonical end-user guide for **MA-001 — the Monitoring & Analytics Dashboard**, covering setup, usage, and troubleshooting. The frontend-side capability summary and delivery surfaces are cross-referenced from the *Monitoring & Analytics (MA-001)* section of [`../architecture/frontend.md`](../architecture/frontend.md); the observability pillars above supply the signals this dashboard is designed to consume.

**Current status (honest maturity).** No part of MA-001 renders today. The single-page application does not build: the `Dashboard` and `Analytics` pages import `useAppSelector`/`useAppDispatch` from `@/store`, but the store exports neither hook `Source: frontend/src/store/index.ts:L19-L22`; the `Analytics` page imports `fetchAnalyticsData` from `@/store/analyticsSlice`, a module that does not exist, and reads `state.analytics.data`, for which no reducer is registered `Source: frontend/src/pages/Analytics.tsx:L7,L15` (the store registers only `vault`, `transaction`, and `user` reducers `Source: frontend/src/store/index.ts:L8-L12`); and both pages consume the shared `Chart`, whose default export, empty prop interfaces, and required `options`/`type` props are not satisfied by the pages' `<Chart data={...} />` usage `Source: frontend/src/components/Chart.tsx:L13-L22`, `Source: frontend/src/pages/Dashboard.tsx:L45`. The backend signals the dashboard would visualize (`/metrics`, `/health`, `/ready`, tracing) are all **Designed** and absent (see Pillars 2–4). Every MA-001 subrequirement below is therefore either **Source-present (non-buildable)** or **Designed** — none is Implemented.

### MA-001 capability and status matrix

| MA-001 subrequirement | SRS intent | Delivery surface (today) | Status | Source / Reference |
|-----------------------|-----------|--------------------------|--------|--------------------|
| MA-001-1 System Health Monitoring | Real-time status of all system components | `Dashboard` page shell; needs `/health`, `/ready`, `/metrics` | Designed (backend health/metrics absent; Pillars 3–4) | `Source: documentation/Software Requirements Specifications (SRS).md:§5 (MA-001-1)`; `Source: backend/internal/api/routes.go:L9-L54` |
| MA-001-2 Transaction Analytics | Analytics on transaction volumes, types, and trends | `Analytics` page + `Chart` | Source-present (non-buildable); `analyticsSlice` absent | `Source: frontend/src/pages/Analytics.tsx:L7,L15` |
| MA-001-3 Performance Metrics | KPIs such as response times and throughput | needs `/metrics` (Prometheus) | Designed (no `/metrics` route) | `Source: backend/internal/api/routes.go:L9-L54`; Pillar 3 |
| MA-001-4 Custom Reports | Generate custom reports from available data | — | Designed (not present in code) | `Source: documentation/Software Requirements Specifications (SRS).md:§5 (MA-001-4)` |
| MA-001-5 Alerts and Notifications | Manage alerts for critical system events | alert catalog only (documented) | Designed (no implementation) | [`runbook.md`](runbook.md) |
| MA-001-6 Data Visualization | Charts and graphs for data | `Chart` component (`react-chartjs-2`) | Source-present (non-buildable); empty interfaces, import/prop mismatch, undeclared deps | `Source: frontend/src/components/Chart.tsx:L1-L22` |

### End-user workflow (setup, usage, troubleshooting)

**Setup.** In the designed target, an operator opens the SPA, authenticates (UA-001; see [`../api-reference/authentication.md`](../api-reference/authentication.md)), and navigates to the **Dashboard** for the vault/transaction summary or to **Analytics** for transaction trends. Prerequisites for even starting the SPA — undeclared dependencies (`@reduxjs/toolkit`, `chart.js`, `react-chartjs-2`), the `@/` path alias, and the absent slices — are enumerated in [`../getting-started/local-development.md`](../getting-started/local-development.md). **Today those prerequisites are unmet and the app does not start.**

**Usage (as designed).** The Dashboard renders a vault list, a transaction list, and a summary `Chart` `Source: frontend/src/pages/Dashboard.tsx:L43-L45`; the Analytics page renders transaction-trend visualizations from an `analytics` store slice `Source: frontend/src/pages/Analytics.tsx:L38-L41`; and system-health and performance panels read from the Designed `/health`, `/ready`, and `/metrics` endpoints previewed by [`dashboard-template.json`](dashboard-template.json). None of these panels display data at this checkpoint.

**Troubleshooting.**
- *Build fails on `useAppSelector`/`useAppDispatch`*: the typed hooks are not exported by the store; this is a Designed export, not a runtime bug `Source: frontend/src/store/index.ts:L19-L22`.
- *`Analytics` fails to compile on `analyticsSlice`*: the slice does not exist and no `analytics` reducer is registered, so the reference is broken `Source: frontend/src/pages/Analytics.tsx:L7,L15`, `Source: frontend/src/store/index.ts:L8-L12`.
- *Charts do not render*: `Chart` is a default export with empty `ChartData`/`ChartOptions` interfaces and required `options`/`type` props the pages do not pass, and `chart.js`/`react-chartjs-2` are not declared dependencies `Source: frontend/src/components/Chart.tsx:L1-L22`.
- *No live metrics or health*: the `/metrics`, `/health`, and `/ready` endpoints are Designed and absent (Pillars 3–4); until they exist the corresponding dashboard panels stay empty.

Because these are documented scaffold gaps, this deliverable changes no source code; the remediations above are Designed targets, tracked in [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md).

## Related documentation

- [`runbook.md`](runbook.md) — alerts and failure modes (ticker panic, settlement retry behavior, signature poll, processor wiring mismatch, HEALTHCHECK gap).
- [`../architecture/scaffold-vs-design.md`](../architecture/scaffold-vs-design.md) — the Implemented/Provisioned/Designed maturity matrix for the whole system.
- [`../architecture/data-flow.md`](../architecture/data-flow.md) — transaction and signature data-flow sequences the observability signals track.
- [`../architecture/backend.md`](../architecture/backend.md) — backend composition and the wiring gaps referenced above.
- [`../index.md`](../index.md) — documentation landing page.
- `Fig O1` is re-expressed in the executive presentation at `../../blitzy-deck/executive-summary.html`.
