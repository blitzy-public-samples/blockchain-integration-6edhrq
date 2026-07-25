# Blockchain Integration Service and Dashboard

> **Project status: early-stage scaffold.** The system is present in source but does **not** build as-is — there is no committed `go.mod` for the backend and several imported packages are absent (see [Project Status](#project-status)). Capabilities below are labelled **Implemented** / **Source-present (non-buildable)** / **Provisioned** / **Designed** (see the [Maturity legend](#description) below); the full reconciliation between the design corpus and the on-disk code lives in [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md).

## Description

A **custodial blockchain integration platform** whose domain is **vaults, signatures, and transactions**, paired with a web dashboard for monitoring and managing those operations. The backend is a Go/Gin HTTP service that exposes **18 REST endpoints** across four resource groups — authentication, vaults, transactions, and signatures. `Source: backend/internal/api/routes.go:L9-L54` The persisted domain is modelled as five entities — `Organization`, `User`, `Vault`, `Transaction`, and `Signature`. `Source: backend/internal/db/schema.go:L11-L68` The dashboard is a React 18 + TypeScript single-page app.

> **Maturity legend.** **Implemented** = present and building today (reserved — nothing qualifies at this checkpoint because there is no `go.mod`); **Source-present (non-buildable)** = the code exists in the tree but its package does not compile as-is (equivalently *Implemented-with-defects (source-present, non-buildable)*); **Provisioned** = scaffolding or configuration that exists and validly applies but is not fully wired (for example the committed CI workflow files); **Designed** = specified in the design corpus or referenced by code, but the backing implementation is absent from a compiling or validly-applying artifact. The authoritative, full vocabulary lives in [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md#maturity-legend).

## Features

| Feature | What it does | Maturity |
|---------|--------------|----------|
| Vault management | Create, list, read, update, and delete custodial vaults (`/vault/*`) | **Source-present (non-buildable)** — routes and service exist in source but the package does not compile `Source: backend/internal/api/routes.go:L24-L32` |
| Signature generation & management | Request and manage signatures over vault operations (`/signatures/*`) | **Source-present (non-buildable)** `Source: backend/internal/api/routes.go:L44-L52` |
| Transaction processing | Submit transactions and settle them asynchronously via a background processor | **Source-present (non-buildable)** `Source: backend/internal/tasks/transaction_processor.go` |
| Authentication & authorization | `POST /auth/login` and `POST /auth/register` are **public**; `POST /auth/logout` and every vault, transaction, and signature group are **intended** to sit behind an authentication middleware | Handlers are **Source-present (non-buildable)**; JWT issuance and route enforcement are **Designed** — the `middleware` and `auth` packages the router references are absent, so no route is guarded at runtime `Source: backend/internal/api/routes.go:L16-L22` |
| Monitoring & analytics dashboard | React dashboard that fetches transaction and vault data on load | Dashboard page **Source-present (non-buildable)**; **real-time** updates are **Designed** — the Dashboard performs a one-time fetch and does not use the separate WebSocket client `Source: frontend/src/pages/Dashboard.tsx`, `Source: frontend/src/services/websocket.ts` |
| Blockchain integrations (XRP Ledger, Ethereum) & Utxo Custodian signing | Sign and broadcast on integrated chains | **Designed** — `internal/blockchain` and `internal/custodian` are imported but absent `Source: backend/cmd/server/main.go:L8-L9` |

## Technology Stack

| Layer | Technology | Maturity | Source |
|-------|------------|----------|--------|
| Backend language | Go — CI uses `go-version: '1.20'`; the Docker image pins `golang:1.17-alpine` (a version discrepancy) | **Source-present (non-buildable)** | `.github/workflows/backend-ci.yml:L17`, `infrastructure/docker/Dockerfile.backend:L2` |
| Web framework | Gin (`github.com/gin-gonic/gin`) | **Source-present (non-buildable)** | `backend/internal/api/routes.go:L4` |
| ORM | GORM (`gorm.io/gorm`) — note the schema uses an undefined `gorm.JSONMap`, a compile blocker | **Source-present (non-buildable)** | `backend/internal/db/schema.go:L8` |
| Database access | sqlx with the `lib/pq` PostgreSQL driver | **Source-present (non-buildable)** | `backend/internal/db/postgres.go:L4-L6` |
| Database | PostgreSQL (`sqlx.Connect("postgres", …)`, `sslmode=disable`) | **Source-present (non-buildable)** connection code; PostgreSQL as system of record is **Designed** | `backend/internal/db/postgres.go:L15-L18` |
| Cache / async status store | Redis via `go-redis/v8` | **Source-present (non-buildable)** | `backend/internal/db/redis.go:L5,L14-L18` |
| Frontend | React 18.2.0 + TypeScript, Create React App (`react-scripts` 5.0.1), React Router DOM 6.11.1 | **Source-present (non-buildable)** | `frontend/package.json:L9-L12` |
| Frontend state / validation / HTTP / charts | Redux Toolkit, Zod, Axios, and Chart.js — **used in source but not declared** in `package.json` | **Designed** (undeclared dependency) | `frontend/src/store/index.ts:L1`, `frontend/src/schema/transaction.ts:L1`, `frontend/src/services/api.ts:L1`, `frontend/src/components/Chart.tsx:L2-L3` |
| Blockchains & custodian | XRP Ledger, Ethereum, and Utxo Custodian signing | **Designed** | `backend/cmd/server/main.go:L8-L9` |

This repository contains **no Hyperledger Fabric, no Solidity, and no GraphQL** — earlier revisions of this README referenced those technologies, but none are present in the codebase.

## Getting Started

### Prerequisites

- **Go** — to reproduce backend CI *exactly*, use the pinned Go **1.20** (this specific line is end-of-life and is stated only to match CI, not as a recommended runtime). `Source: .github/workflows/backend-ci.yml:L17` For local work on a supported runtime, use a current Go release; note the backend does not build regardless (no `go.mod`).
- **Node.js with npm** — to reproduce frontend CI *exactly*, use the pinned Node **14.x** (also end-of-life; stated only to match CI). `Source: .github/workflows/frontend-ci.yml:L17` For local work on a supported runtime, use a current Node LTS; note the frontend does not build regardless (undeclared dependencies and absent modules).
- **PostgreSQL** — the **Designed** primary datastore (connection code is source-present but non-buildable). `Source: backend/internal/db/postgres.go:L15-L18`
- **Redis** — the **Designed** cache and async status store (connection code is source-present but non-buildable). `Source: backend/internal/db/redis.go:L14-L18`

### Installation

Clone the repository, then set up each track independently.

> **Note:** the clone URL below is a **placeholder** — replace `<your-org>/<your-repo>` with the actual repository location. It is not a real, resolvable URL.

```bash
git clone https://github.com/<your-org>/<your-repo>.git
cd <your-repo>
```

**Backend (Go).** Build and test with the standard Go toolchain. `Source: .github/workflows/backend-ci.yml:L19,L30`

```bash
cd backend
go build ./...   # Note: no go.mod is committed, so this is a scaffold and will NOT build as-is
```

**Frontend (React / Create React App).** `Source: frontend/package.json:L20-L27` Installing dependencies does **not** make the frontend build: beyond the missing lockfile, the source uses undeclared dependencies (Redux Toolkit, Zod, Axios, Chart.js), references absent Redux slices, hooks, utilities and types, and has export/import mismatches, so `npm install` alone cannot produce a working build.

```bash
cd frontend
npm install   # Note: no package-lock.json is committed, so CI's `npm ci` cannot run; and this alone will NOT make the app build
```

### Configuration

Configuration is **Designed** to be supplied through environment variables. The PostgreSQL DSN (host, port, user, password, database, `sslmode`) and the Redis connection settings are read by source-present (non-buildable) initialization code. `Source: backend/internal/db/postgres.go:L15-L18` `Source: backend/internal/db/redis.go:L14-L18` JWT configuration (for example a signing secret and token lifetimes) is **Designed only**: there is no config package or loader in the tree that reads it, so no concrete JWT configuration keys are asserted here — see the configuration guide for the intended variables.

> **Note:** a sample environment template file is **not** committed to the repository (**Designed**), so there is no example env file to copy into place. Configure the environment variables described in [`docs/getting-started/configuration.md`](docs/getting-started/configuration.md) directly.

## Usage

**Run the backend** (intended to compile the composition root under `cmd/server`). The backend Dockerfile declares `EXPOSE 8080`, which documents the *intended* container port for tooling — it does **not** itself bind a socket or start a listener; only the running process does that. `Source: backend/cmd/server/main.go` `Source: infrastructure/docker/Dockerfile.backend:L20`

```bash
cd backend
go run ./cmd/server   # Note: scaffold — requires a go.mod and the currently-absent packages; will NOT run as-is
```

**Run the frontend** development server; on a working build the Create React App default dev server serves the dashboard at `http://localhost:3000`. `Source: frontend/package.json:L21` As noted under Installation, the frontend does not build as-is, so `npm start` will not serve the dashboard until the compile blockers are resolved.

```bash
cd frontend
npm start   # Note: will NOT serve until the frontend compile blockers (see Installation) are resolved
```

## Project Status

This repository is an **early-stage scaffold**: the code is written but is not yet wired to compile end-to-end. Known, deliberately-documented gaps include:

- **No `go.mod`** is committed for the backend, so `go build ./...` cannot resolve modules. `Source: repository root (no go.mod present)`
- Several backend packages are **imported but absent** — `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware`. The import statements are present in the composition root (`Source: backend/cmd/server/main.go:L6-L12`); the corresponding packages do not exist anywhere in `backend/` (verified against the tree).
- The composition root calls `api.SetupRouter(router, dbConn, blockchainClients, custodianClient)` with four arguments, but the router defines `SetupRouter()` with none — a signature mismatch. `Source: backend/cmd/server/main.go:L52` `Source: backend/internal/api/routes.go:L9`

These are captured honestly rather than hidden. For the complete **Implemented / Provisioned / Designed** reconciliation and the full defect catalog, see [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md).

## Documentation

Full documentation lives in the [`docs/`](docs/index.md) tree:

- **[Documentation home](docs/index.md)** — navigation and audience map
- **Getting started** — [Installation](docs/getting-started/installation.md) · [Configuration](docs/getting-started/configuration.md)
- **[Architecture Overview](docs/architecture/overview.md)** — current-vs-target (before/after) architecture diagrams
- **[API Reference](docs/api-reference/overview.md)** — all 18 endpoints, plus the machine-readable [OpenAPI specification](docs/api-reference/openapi.yaml)
- **[Observability](docs/operations/observability.md)** — logging, tracing, metrics, health checks, and the dashboard template
- **[System Administration](docs/operations/system-administration.md)** — consolidated operator/admin guide (configuration, deployment, database, backup, monitoring, security, incident response)
- **[Security Model](docs/security/security-model.md)** — RBAC, JWT, MFA, and encryption
- **[Training Materials](docs/training/training-materials.md)** — role-based onboarding course and written guides for common operations
- **[Scaffold vs. Design Reconciliation](docs/architecture/scaffold-vs-design.md)** — the honest maturity matrix
- **[Executive Summary](blitzy-deck/executive-summary.html)** — a self-contained presentation for leadership

**Project governance:** [Contributing guidelines](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [License](LICENSE)

**Authoritative design references** (under `documentation/`): [Software Project Proposal](<documentation/Software Project Proposal.md>) · [Software Requirements Specification (SRS)](<documentation/Software Requirements Specifications (SRS).md>) · [Technical Specifications](<documentation/Technical Specifications.md>).

## API Documentation

The complete developer-facing API reference — including request/response schemas and examples for all 18 endpoints — is at [`docs/api-reference/overview.md`](docs/api-reference/overview.md), with the OpenAPI 3.0 contract in [`docs/api-reference/openapi.yaml`](docs/api-reference/openapi.yaml).

## Contributing

Contributions are welcome. Please read the [`CONTRIBUTING.md`](CONTRIBUTING.md) guidelines before submitting changes.

## License

This project is licensed under the MIT License. See the [`LICENSE`](LICENSE) file for details.

## Contact

No official support channel is published for this repository yet. The address
`blockchain-support@example.com` that appeared here previously was a **placeholder**
(the `example.com` domain is reserved for documentation and is not a real
mailbox); it has been removed to avoid implying a working contact. Replace this
section with a real support channel — an issue tracker, mailing list, or team
address — when one is established.
