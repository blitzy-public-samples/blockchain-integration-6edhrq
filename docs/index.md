# Blockchain Integration Service and Dashboard — Documentation

This `docs/` tree is the developer-, operator-, and reviewer-facing documentation for the Blockchain Integration Service and Dashboard **as the system actually exists on disk today** — an early-stage Go/React scaffold — and it reconciles that reality against the aspirational design corpus under [`documentation/`](#design-references). The documented subject is a **custodial blockchain platform** whose domain is **vaults, signatures, and transactions**, served over **18 REST endpoints** by a **Go/Gin backend** that is **Designed** to persist to **PostgreSQL and Redis** (the persistence code is source-present but non-buildable). `Source: backend/internal/api/routes.go:L9-L54` The domain is modelled as five entities — `Organization`, `User`, `Vault`, `Transaction`, and `Signature`. `Source: backend/internal/db/schema.go:L11-L68` The dashboard is a **React 18 + TypeScript** single-page application built with Create React App; its state layer uses Redux Toolkit, which is imported in source but **not declared** in `package.json` (an undeclared dependency). `Source: frontend/src/store/index.ts:L1`, `Source: frontend/package.json`

> **Design corpus vs. as-built.** The three documents under `documentation/` — the [Software Project Proposal](<../documentation/Software Project Proposal.md>), the [Software Requirements Specification (SRS)](<../documentation/Software Requirements Specifications (SRS).md>), and the [Technical Specifications](<../documentation/Technical Specifications.md>) — remain the authoritative **design** references (what the system is intended to become). This `docs/` tree documents the **as-built** system (what is present in code now) and labels every capability's maturity so the two are never confused. Where they diverge, the code is authoritative and the divergence is documented, not hidden.

## Maturity Legend

Every capability across this documentation set is tagged with a project-wide maturity discipline so readers can distinguish what is present in code from what is only specified:

- **Implemented** — present and working in the code today. At this checkpoint this label is **reserved**: nothing currently qualifies for the unqualified `Implemented` because the backend has no committed `go.mod` (`Source: repository root (no go.mod present)`) and does not build end-to-end — for example the composition root calls `SetupRouter` with four arguments against a zero-argument definition (`Source: backend/cmd/server/main.go:L52`, `Source: backend/internal/api/routes.go:L9`).
- **Provisioned** — infrastructure or configuration exists in source, but the capability is not yet fully wired or exercised.
- **Designed** — specified in the design corpus (`documentation/*.md`), but not yet built (absent from code).

The **authoritative, full vocabulary** — including the composite qualifiers *Implemented-with-defects (source-present, non-buildable)* and *Implemented-but-broken*, together with the consolidated maturity matrix and the complete defect catalog — lives in the reconciliation page's [Maturity Legend](architecture/scaffold-vs-design.md#maturity-legend). Sibling pages defer to it.

> **Known code defects are documented honestly, not fixed.** The scaffold contains concrete, verified gaps — an uninitialized ticker interval that *would* panic at startup, latent behind the compile failure that stops the build first `Source: backend/internal/tasks/transaction_processor.go:L13-L16`, `Source: backend/internal/tasks/transaction_processor.go:L10`, a router-signature mismatch between the composition root's four-argument call and the router's zero-argument definition `Source: backend/cmd/server/main.go:L52`, `Source: backend/internal/api/routes.go:L9`, backend packages that are imported (`Source: backend/cmd/server/main.go:L6-L12`) but absent from the tree, and no committed `go.mod` (`Source: repository root (no go.mod present)`). These are catalogued in full in [`architecture/scaffold-vs-design.md`](architecture/scaffold-vs-design.md) rather than silently omitted.

## Documentation Map

The tree is organized into seven sections plus a leadership-facing executive summary, as shown in **Figure IX1**. Start from your audience row in the [Audiences](#audiences) table below, then use the [Navigation](#navigation) section for the full page list. The role-based onboarding curriculum lives on this page rather than in a section of its own — see [Role-Based Onboarding and Training Paths](#role-based-onboarding-and-training-paths).

**Figure IX1 — Documentation Map (sections of the `docs/` tree and their entry points)**

```mermaid
flowchart TD
    subgraph Legend_IX1["Legend"]
        LG1["Rectangle = documentation section (a folder of pages)"]
        LG2(["Stadium = authoritative maturity and defect reconciliation"])
    end

    Index["Documentation Home — docs/index.md (you are here)"]
    Index --> GS["Getting Started"]
    Index --> ARCH["Architecture"]
    Index --> API["API Reference"]
    Index --> GUIDE["Guides"]
    Index --> OPS["Operations (incl. System Administration, Runbook)"]
    Index --> SEC["Security"]
    Index --> CONTRIB["Contributing"]
    Index --> TRAIN(["Role-Based Onboarding Paths (this page)"])
    Index --> DECK["Executive Summary (leadership)"]

    ARCH --> SVD(["Scaffold vs. Design"])
    API --> SVD

    %% Legend: rectangles are sections; stadium nodes are pages rather than
    %% folders — Scaffold vs. Design is the single source of truth for maturity
    %% labels and the defect catalog, and the onboarding paths live on this page.
```

As **Figure IX1** shows, both the Architecture and API Reference sections point at the *Scaffold vs. Design* reconciliation as the single source of truth for maturity and defects, and the onboarding curriculum is a section of this page rather than a folder of its own.

## Audiences

Pick your starting point by role. Every path below resolves within this tree except the executive summary, which lives beside it under `blitzy-deck/`.

| Audience | Start here |
|----------|------------|
| New developers | [Installation](getting-started/installation.md), then [Local Development](getting-started/local-development.md) |
| New team members / trainees | [Role-Based Onboarding and Training Paths](#role-based-onboarding-and-training-paths) — the reading order for each role |
| Backend / API engineers | [Backend Architecture](architecture/backend.md) and [API Reference — Overview](api-reference/overview.md) |
| Frontend engineers | [Frontend Architecture](architecture/frontend.md) |
| Operators / SRE | [Observability](operations/observability.md) and [Operations Runbook](operations/runbook.md) |
| System administrators / DevOps | [System administration entry point](operations/runbook.md#system-administration-entry-point) in the Operations Runbook |
| Security reviewers | [Security Model](security/security-model.md) |
| Contributors | [Development Workflow](contributing/development.md) and [Testing Strategy](contributing/testing.md) |
| Non-technical leadership / executives | [Executive Summary](../blitzy-deck/executive-summary.html) (self-contained presentation) |

## Role-Based Onboarding and Training Paths

This section is the written onboarding and training curriculum for the documentation set — the artifact the Software Project Proposal lists as *written guides for common operations* under its Training-Materials deliverable. `Source: documentation/Software Project Proposal.md:L419-L421` It prescribes a reading order per role over the authoritative pages in this tree rather than restating their content, so a trainee always lands on the page that owns each topic. The deliverable's companion *video tutorials* item remains **Designed** — no video artifact is produced by this documentation-only work. `Source: documentation/Software Project Proposal.md:L419-L421`

Two categories of training are distinguished so no trainee is misled:

- **Conceptual and documentation training — usable today.** Understanding the domain (vaults, signatures, transactions), the architecture, the maturity vocabulary, the API surface, the security model, and how to navigate this tree. Every step below is exercisable now against the repository and its documentation.
- **Hands-on operational walkthroughs — Designed.** Any instruction to act in the *running* application (log in, create a vault, submit a transaction, watch the dashboard update) describes the **intended** system. The application does not build or run from this repository as-is, so those walkthroughs become executable only after the defects catalogued in [`architecture/scaffold-vs-design.md`](architecture/scaffold-vs-design.md#defect-catalog) are resolved. Each feature guide states this explicitly in its own status section.

The five roles are the **Designed** RBAC roles defined in [`security/security-model.md`](security/security-model.md); each maps to a value of `User.Role`, which is a plain unconstrained string in code today. `Source: backend/internal/db/schema.go:L27` **Figure IX2** shows the recommended path for each role.

**Figure IX2 — Role-Based Onboarding Paths (recommended reading order per role)**

```mermaid
flowchart TD
    subgraph Legend_IX2["Legend"]
        LG1["Rectangle = onboarding stage"]
        LG2(["Stadium = authoritative page in this tree"])
        LG3["Solid arrow = recommended order"]
    end

    START["New team member"] --> FND["Stage 1: Foundations — maturity vocabulary and navigation"]
    FND --> DOMAIN["Stage 2: Domain and architecture"]

    DOMAIN --> ADMINP["Admin / Manager path"]
    DOMAIN --> OPP["Operator path"]
    DOMAIN --> AUDP["Auditor path"]
    DOMAIN --> APIP["API User path"]

    FND --> SVD(["architecture/scaffold-vs-design.md"])
    DOMAIN --> AOV(["architecture/overview.md"])
    DOMAIN --> DM(["architecture/data-model.md"])

    ADMINP --> SYSADMIN(["operations/runbook.md — system administration"])
    ADMINP --> AUTH(["api-reference/authentication.md — UA-001"])
    OPP --> VG(["guides/vault-management.md — VM-001"])
    OPP --> TG(["guides/transaction-processing.md — TP-001"])
    OPP --> SG(["guides/signature-management.md — SG-001"])
    OPP --> OBS(["operations/observability.md — MA-001"])
    AUDP --> OBS
    AUDP --> SEC(["security/security-model.md"])
    APIP --> API(["api-reference/overview.md"])

    %% Legend: rectangles are onboarding stages; stadium nodes are the
    %% authoritative pages each stage reads.
```

As **Figure IX2** shows, every role begins with the same two stages — Foundations and Domain and Architecture — before branching into role-specific pages; the stadium nodes are the pages that own each topic.

- **Stage 1 — Foundations (usable today).** Learn what the platform is: a custodial blockchain integration platform whose domain is vaults, signatures, and transactions, with a Go/Gin backend over 18 REST endpoints and a React 18 dashboard. `Source: backend/internal/api/routes.go:L9-L54` Learn the maturity vocabulary — *Implemented*, *Source-present (non-buildable)*, *Provisioned*, *Designed* — from the authoritative [Maturity Legend](architecture/scaffold-vs-design.md#maturity-legend), and learn that every claim carries a `Source:` citation. **Exercise:** open [`architecture/scaffold-vs-design.md`](architecture/scaffold-vs-design.md) and locate three capabilities, one at each maturity level.
- **Stage 2 — Domain and architecture (usable today).** Read the before/after architecture pair **Fig A1**/**Fig A2** in [`architecture/overview.md`](architecture/overview.md), then the five entities and **Fig M1** in [`architecture/data-model.md`](architecture/data-model.md). **Exercise:** trace one entity from its Go struct citation through to the endpoint that operates on it in [`api-reference/overview.md`](api-reference/overview.md).
- **Role branches.** Read the pages listed for your role in the table below, in order. Each feature guide contains its own setup, usage, and troubleshooting sections, and states which of its steps are **Designed**.

| Role | Reading order after Stages 1–2 |
|------|--------------------------------|
| Admin | [System administration](operations/runbook.md#system-administration-entry-point) → [UA-001 authentication guide](api-reference/authentication.md#user-authentication--authorization-guide-ua-001) → [Observability / MA-001](operations/observability.md) → [Security model](security/security-model.md) |
| Manager | [UA-001 authentication guide](api-reference/authentication.md#user-authentication--authorization-guide-ua-001) → [VM-001](guides/vault-management.md) → [TP-001](guides/transaction-processing.md) → [SG-001](guides/signature-management.md) → [Observability / MA-001](operations/observability.md) |
| Operator | [VM-001](guides/vault-management.md) → [TP-001](guides/transaction-processing.md) → [SG-001](guides/signature-management.md) → [Observability / MA-001](operations/observability.md) → [Runbook FM-1 … FM-5](operations/runbook.md) |
| Auditor | [Observability / MA-001](operations/observability.md) → [Security model](security/security-model.md) → [Scaffold vs. Design](architecture/scaffold-vs-design.md) |
| API User | [UA-001 authentication guide](api-reference/authentication.md#user-authentication--authorization-guide-ua-001) → [API Reference — Overview](api-reference/overview.md) → [`api-reference/openapi.yaml`](api-reference/openapi.yaml) |

Contributors joining the codebase itself should follow [`contributing/development.md`](contributing/development.md) and [`contributing/testing.md`](contributing/testing.md) after Stage 2; non-technical leadership should read the [Executive Summary](../blitzy-deck/executive-summary.html) instead of this curriculum.

## Navigation

Every link below points to a page produced as part of this documentation set. All paths are relative to this file (`docs/index.md`).

The two Software Project Proposal deliverables that have no page of their own — the *system administration guide* (item 6) and the *written guides for common operations* (item 10) — are delivered inside pages that do: system administration is the [system administration entry point](operations/runbook.md#system-administration-entry-point) in the Operations Runbook, and the training curriculum is [Role-Based Onboarding and Training Paths](#role-based-onboarding-and-training-paths) above. `Source: documentation/Software Project Proposal.md:L401-L402`, `Source: documentation/Software Project Proposal.md:L419-L421`

### Getting Started

- [`getting-started/installation.md`](getting-started/installation.md) — Prerequisites (Go, Node, PostgreSQL, Redis) and install steps; corrects the stale `mysql`/`.env.example` errors carried by `scripts/setup.sh`.
- [`getting-started/configuration.md`](getting-started/configuration.md) — Environment variables, the PostgreSQL DSN and `sslmode`, Redis connection settings, and JWT configuration.
- [`getting-started/local-development.md`](getting-started/local-development.md) — Local development workflow and build caveats (no committed `go.mod`, no frontend lockfile, tsconfig/CRA notes).

### Architecture

- [`architecture/overview.md`](architecture/overview.md) — System overview with the before/after pair **Fig A1** (current-implemented scaffold) and **Fig A2** (designed target).
- [`architecture/backend.md`](architecture/backend.md) — The Go/Gin layered modular monolith, dependency injection, and composition-root wiring-gap callouts.
- [`architecture/frontend.md`](architecture/frontend.md) — The React 18 + Redux Toolkit component and state architecture (**Fig A3**), plus the client-side Zod validation reference for the three schema modules.
- [`architecture/data-flow.md`](architecture/data-flow.md) — Authentication, transaction-settlement, and signature sequences (**Fig B1/B2/B3**) plus the end-to-end data flow (**Fig DF1**).
- [`architecture/data-model.md`](architecture/data-model.md) — The five GORM entities, field tables, the ERD (**Fig M1**), and the dual-identifier gap note. `Source: backend/internal/db/schema.go:L11-L68`
- [`architecture/scaffold-vs-design.md`](architecture/scaffold-vs-design.md) — The authoritative Implemented/Provisioned/Designed matrix and the full defect catalog reconciling the design corpus against the on-disk scaffold.

### API Reference

The backend exposes **18 REST endpoints** with no `/api/v1` prefix and a singular `/vault` path. `Source: backend/internal/api/routes.go:L9-L54`

- [`api-reference/overview.md`](api-reference/overview.md) — OpenAPI introduction, the `swag init` workflow, the full endpoint index, and the path-prefix/pluralization discrepancy.
- [`api-reference/authentication.md`](api-reference/authentication.md) — The three `/auth` endpoints (login, register, logout) with request/response examples.
- [`api-reference/vaults.md`](api-reference/vaults.md) — The five `/vault` endpoints; includes the `/vault` (backend) vs `/vaults` (frontend) note.
- [`api-reference/transactions.md`](api-reference/transactions.md) — The five `/transactions` endpoints; includes the transaction status-vocabulary note.
- [`api-reference/signatures.md`](api-reference/signatures.md) — The five `/signatures` endpoints; includes the **Designed** Kafka publish step.
- [`api-reference/openapi.yaml`](api-reference/openapi.yaml) — The machine-readable OpenAPI 3.0 contract for all 18 endpoints.

### Guides

- [`guides/vault-management.md`](guides/vault-management.md) — End-user guide for Vault Management (VM-001): setup, usage, and troubleshooting.
- [`guides/transaction-processing.md`](guides/transaction-processing.md) — End-user guide for Transaction Processing (TP-001) and the asynchronous settlement model.
- [`guides/signature-management.md`](guides/signature-management.md) — End-user guide for Signature Generation & Management (SG-001).
- [`guides/deployment.md`](guides/deployment.md) — Deployment topology (**Designed**: ECS Fargate + ALB + RDS + ElastiCache) and the ECR/ECS reconciliation.

### Operations

- [`operations/observability.md`](operations/observability.md) — Structured logging with correlation IDs, distributed tracing, a `/metrics` endpoint, and health/readiness checks, stating precisely what is **reused** (Gin access logging and worker structured logging — both **emission-only** and **source-present (non-buildable)**, so they do not run today) versus **added** (**Designed** correlation IDs, tracing, metrics, health endpoints).
- [`operations/runbook.md`](operations/runbook.md) — Alerts and failure modes (FM-1 … FM-5), including the startup ticker panic and settlement-retry behavior, plus the consolidated [system administration entry point](operations/runbook.md#system-administration-entry-point) covering configuration, deployment, database and cache administration, backup and recovery, monitoring, user and role administration, security administration, and incident response. Delivers Software Project Proposal DELIVERABLES item 6 ("User Manuals" → *System administration guide*). `Source: documentation/Software Project Proposal.md:L401-L402`
- [`operations/dashboard-template.json`](operations/dashboard-template.json) — The observability dashboard template (metric, log, and health panels).

### Security

- [`security/security-model.md`](security/security-model.md) — Role-based access control (Admin/Manager/Operator/Auditor/API User), JWT with refresh tokens, multi-factor authentication, and encryption. It also carries the [documentation toolchain supply chain and advisory posture](security/security-model.md#documentation-toolchain-supply-chain-and-advisory-posture) — the dependency inventory for this documentation set and the executive deck, with every open CVE/GHSA against the pinned CDN chain enumerated, reachability-assessed, and maturity-labeled.

### Contributing

- [`contributing/development.md`](contributing/development.md) — Contribution workflow and CI overview.
- [`contributing/testing.md`](contributing/testing.md) — Test strategy and coverage targets, plus the durable [documentation quality-assurance gate ledger](contributing/testing.md#documentation-quality-assurance-gate-ledger) recording every review gate this deliverable has passed and the [evidence integrity rules](contributing/testing.md#evidence-integrity-rules) that govern it.

## Project & Governance Links

These files live at the repository root, one level above this tree:

- [`../README.md`](../README.md) — Repository entry point and stack summary (this documentation is its home).
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — Contribution guidelines.
- [`../CHANGELOG.md`](../CHANGELOG.md) — Project changelog.
- [`../LICENSE`](../LICENSE) — License terms.
- [`../blitzy-deck/executive-summary.html`](../blitzy-deck/executive-summary.html) — Self-contained executive presentation for non-technical leadership.

## Design References

The authoritative **design** corpus (intended target; not the as-built state) lives under `../documentation/`:

- [Software Project Proposal](<../documentation/Software Project Proposal.md>) — project scope and committed deliverables.
- [Software Requirements Specification (SRS)](<../documentation/Software Requirements Specifications (SRS).md>) — the five product features (VM-001, SG-001, TP-001, UA-001, MA-001), non-functional requirements, and the glossary that anchors terminology across this tree.
- [Technical Specifications](<../documentation/Technical Specifications.md>) — system architecture, database design, API design, technology stack, and security.

## Known Divergences

Three divergences between the code, the frontend, and the design corpus are load-bearing enough to call out here; each is detailed on the linked page rather than duplicated:

- **Resource path disagreement.** The backend router registers a singular, unprefixed `/vault` group, while the frontend client calls the plural `/vaults`, and the Technical Specification documents `/api/v1/vaults`. `Source: backend/internal/api/routes.go:L25-L31`, `Source: frontend/src/services/api.ts:L32-L34` See [`api-reference/overview.md`](api-reference/overview.md).
- **Transaction status vocabulary.** The frontend and backend use different status vocabularies for transactions; the reconciliation is documented on [`api-reference/transactions.md`](api-reference/transactions.md) and in [`architecture/scaffold-vs-design.md`](architecture/scaffold-vs-design.md).
- **Design vs. scaffold maturity.** The broader set of design-versus-code gaps (absent packages, the ticker panic, the router-signature mismatch, the dual-identifier GORM inconsistency) is enumerated in [`architecture/scaffold-vs-design.md`](architecture/scaffold-vs-design.md).

## Maintaining This Documentation

This tree **aims** to attach an inline `Source: <path>:<locator>` citation to every technical claim so it can be re-verified against the code, and to label every capability with its maturity (**Implemented**, **Source-present (non-buildable)**, **Provisioned**, or **Designed**). Treat this as the maintenance standard rather than a guarantee that every line already meets it: where a citation or label is found to be missing, imprecise, or stale, correct it against the source. When a source file changes, update the pages that cite it and re-check their maturity labels against the authoritative [Maturity Legend](architecture/scaffold-vs-design.md#maturity-legend).

Two classes of claim also go stale without any source file changing, because they are verified against external services rather than the repository. Re-verify both when reviewing this tree, and record the new verification date alongside the claim:

- **Third-party advisory counts** for the pinned documentation and deck dependencies — re-run the audit commands in [Reproducing this audit](security/security-model.md#reproducing-this-audit) and update the tables there; advisory databases only grow.
- **Runtime support windows** (Node.js and Go release status), which advance on published schedules — see the dated notes in [`contributing/development.md`](contributing/development.md#known-limitations).
