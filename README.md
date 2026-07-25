# Blockchain Integration Service and Dashboard

> **Project status: early-stage scaffold.** The system is present in source but does **not** build as-is — there is no committed `go.mod` for the backend and several imported packages are absent (see [Project Status](#project-status)). Capabilities below are labelled **Implemented** / **Provisioned** / **Designed**; the full reconciliation between the design corpus and the on-disk code lives in [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md).

## Description

A **custodial blockchain integration platform** whose domain is **vaults, signatures, and transactions**, paired with a web dashboard for monitoring and managing those operations. The backend is a Go/Gin HTTP service that exposes **18 REST endpoints** across four resource groups — authentication, vaults, transactions, and signatures. `Source: backend/internal/api/routes.go:L9-L54` The persisted domain is modelled as five entities — `Organization`, `User`, `Vault`, `Transaction`, and `Signature`. `Source: backend/internal/db/schema.go:L11-L68` The dashboard is a React 18 + TypeScript single-page app.

> **Maturity legend.** **Implemented** = present and building today (reserved — nothing qualifies at this checkpoint because there is no `go.mod`); **Provisioned** = scaffolding/configuration exists in source but is not yet wired to run; **Designed** = specified in code or the design docs, but the backing implementation is absent. See [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md).

## Features

| Feature | What it does | Maturity |
|---------|--------------|----------|
| Vault management | Create, list, read, update, and delete custodial vaults (`/vault/*`) | **Provisioned** — routes and service scaffolded in source `Source: backend/internal/api/routes.go:L24-L32` |
| Signature generation & management | Request and manage signatures over vault operations (`/signatures/*`) | **Provisioned** `Source: backend/internal/api/routes.go:L44-L52` |
| Transaction processing | Submit transactions and settle them asynchronously via a background processor | **Provisioned** `Source: backend/internal/tasks/transaction_processor.go` |
| Authentication & authorization | JWT-guarded routes behind auth middleware (`/auth/*`) | **Provisioned** `Source: backend/internal/api/routes.go:L16-L22` |
| Monitoring & analytics dashboard | React dashboard for real-time transaction and vault monitoring | **Provisioned** `Source: frontend/src/pages/Dashboard.tsx` |
| Blockchain integrations (XRP Ledger, Ethereum) & Utxo Custodian signing | Sign and broadcast on integrated chains | **Designed** — `internal/blockchain` and `internal/custodian` are imported but absent `Source: backend/cmd/server/main.go:L8-L9` |

## Technology Stack

| Layer | Technology | Maturity | Source |
|-------|------------|----------|--------|
| Backend language | Go — CI uses `go-version: '1.20'`; the Docker image pins `golang:1.17-alpine` (a version discrepancy) | **Provisioned** | `.github/workflows/backend-ci.yml:L17`, `infrastructure/docker/Dockerfile.backend:L2` |
| Web framework | Gin (`github.com/gin-gonic/gin`) | **Provisioned** | `backend/internal/api/routes.go:L4` |
| ORM | GORM (`gorm.io/gorm`) | **Provisioned** | `backend/internal/db/schema.go:L8` |
| Database access | sqlx with the `lib/pq` PostgreSQL driver | **Provisioned** | `backend/internal/db/postgres.go:L4-L6` |
| Database | PostgreSQL (`sqlx.Connect("postgres", …)`, `sslmode=disable`) | **Provisioned** | `backend/internal/db/postgres.go:L15-L18` |
| Cache / async status store | Redis via `go-redis/v8` | **Provisioned** | `backend/internal/db/redis.go:L5,L14-L18` |
| Frontend | React 18.2.0 + TypeScript, Create React App (`react-scripts` 5.0.1), React Router DOM 6.11.1 | **Provisioned** | `frontend/package.json:L9-L12` |
| Frontend state / validation / HTTP / charts | Redux Toolkit, Zod, Axios, and Chart.js — **used in source but not declared** in `package.json` | **Designed** (undeclared dependency) | `frontend/src/store/index.ts:L1`, `frontend/src/schema/transaction.ts:L1`, `frontend/src/services/api.ts:L1`, `frontend/src/components/Chart.tsx:L2-L3` |
| Blockchains & custodian | XRP Ledger, Ethereum, and Utxo Custodian signing | **Designed** | `backend/cmd/server/main.go:L8-L9` |

This repository contains **no Hyperledger Fabric, no Solidity, and no GraphQL** — earlier revisions of this README referenced those technologies, but none are present in the codebase.

## Getting Started

### Prerequisites

- **Go 1.20+** — for building and testing the backend. `Source: .github/workflows/backend-ci.yml:L17`
- **Node.js 18+ with npm** — for the frontend. Note that CI currently pins Node **14.x**. `Source: .github/workflows/frontend-ci.yml:L17`
- **PostgreSQL** — primary datastore. `Source: backend/internal/db/postgres.go:L15-L18`
- **Redis** — cache and async status store. `Source: backend/internal/db/redis.go:L14-L18`

### Installation

Clone the repository, then set up each track independently.

```bash
git clone https://github.com/your-username/blockchain-integration-service.git
cd blockchain-integration-service
```

**Backend (Go).** Build and test with the standard Go toolchain. `Source: .github/workflows/backend-ci.yml:L19,L30`

```bash
cd backend
go build ./...   # ⚠ no go.mod is committed, so this is a scaffold and will not build as-is
```

**Frontend (React / Create React App).** Install dependencies and use the CRA scripts. `Source: frontend/package.json:L20-L27`

```bash
cd frontend
npm install   # ⚠ no package-lock.json is committed, so CI's `npm ci` cannot run as-is
```

### Configuration

Configuration is supplied through environment variables read by the backend — a PostgreSQL DSN (host, port, user, password, database, `sslmode`), Redis connection settings, and JWT secrets. `Source: backend/internal/db/postgres.go:L15-L18` `Source: backend/internal/db/redis.go:L14-L18`

> **Note:** a sample environment template file is **not** yet committed to the repository (**Designed**), so there is no example env file to copy into place. Configure the environment variables described in [`docs/getting-started/configuration.md`](docs/getting-started/configuration.md) directly.

## Usage

**Run the backend** (compiles the composition root under `cmd/server`; the backend container listens on port 8080). `Source: backend/cmd/server/main.go` `Source: infrastructure/docker/Dockerfile.backend:L20`

```bash
cd backend
go run ./cmd/server   # ⚠ scaffold: requires a go.mod and the currently-absent packages
```

**Run the frontend** development server, then open the dashboard at `http://localhost:3000` (the Create React App default dev server). `Source: frontend/package.json:L21`

```bash
cd frontend
npm start
```

## Project Status

This repository is an **early-stage scaffold**: the code is written but is not yet wired to compile end-to-end. Known, deliberately-documented gaps include:

- **No `go.mod`** is committed for the backend, so `go build ./...` cannot resolve modules. `Source: infrastructure/docker/Dockerfile.backend:L8`
- Several backend packages are **imported but absent** — `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware`. `Source: backend/cmd/server/main.go:L6-L12`
- The composition root calls `api.SetupRouter(router, dbConn, blockchainClients, custodianClient)` with four arguments, but the router defines `SetupRouter()` with none — a signature mismatch. `Source: backend/cmd/server/main.go:L52` `Source: backend/internal/api/routes.go:L9`

These are captured honestly rather than hidden. For the complete **Implemented / Provisioned / Designed** reconciliation and the full defect catalog, see [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md).

## Documentation

Full documentation lives in the [`docs/`](docs/index.md) tree:

- **[Documentation home](docs/index.md)** — navigation and audience map
- **Getting started** — [Installation](docs/getting-started/installation.md) · [Configuration](docs/getting-started/configuration.md)
- **[Architecture Overview](docs/architecture/overview.md)** — current-vs-target (before/after) architecture diagrams
- **[API Reference](docs/api-reference/overview.md)** — all 18 endpoints, plus the machine-readable [OpenAPI specification](docs/api-reference/openapi.yaml)
- **[Observability](docs/operations/observability.md)** — logging, tracing, metrics, health checks, and the dashboard template
- **[Security Model](docs/security/security-model.md)** — RBAC, JWT, MFA, and encryption
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

For any questions or support, please contact our team at blockchain-support@example.com.
