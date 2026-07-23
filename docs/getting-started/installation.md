# Installation

This page lists the prerequisites and walks through the two install tracks — the Go/Gin backend and the React 18 + TypeScript frontend — needed to obtain a local checkout of the Blockchain Integration Service and Dashboard. It also corrects the inaccurate `scripts/setup.sh` bootstrap script and records the build reality honestly using maturity labels (**Implemented**, **Provisioned**, **Designed**). Environment configuration is covered in [configuration.md](./configuration.md); the day-to-day developer workflow and build caveats are covered in [local-development.md](./local-development.md).

## System Stack

The system is a custodial blockchain integration platform composed of two deployable units:

- **Backend** — a Go service built on the Gin web framework (Source: backend/cmd/server/main.go:L4), persisting to **PostgreSQL** through the `lib/pq` driver (Source: backend/internal/db/postgres.go:L5,L18) and to **Redis** through `go-redis/v8` (Source: backend/internal/db/redis.go:L5).
- **Frontend** — a **React 18.2.0** single-page dashboard written in TypeScript and built with Create React App (`react-scripts` 5.0.1) (Source: frontend/package.json:L9-L13).

This documentation describes the repository as it exists on disk. Where a capability is wired in code it is labeled **Implemented**; where it exists only in container or infrastructure definitions it is **Provisioned**; where it is referenced or intended but not yet buildable it is **Designed**.

## Prerequisites

Install the following tooling before starting either track. The versions reflect what the repository's CI and container definitions actually declare.

| Tool | Version | Why | Source |
|------|---------|-----|--------|
| Go | `1.20` in CI; `1.17` in the backend Docker image (**discrepancy** — use Go 1.20+ locally to match CI) | Compile and run the Gin backend | `.github/workflows/backend-ci.yml:L17`, `infrastructure/docker/Dockerfile.backend:L2` |
| Node.js + npm | `14.x` in CI; a supported LTS (**Node 22+**; Node 18 and 20 are now end-of-life) recommended locally, since the CI-pinned Node 14 is end-of-life | Build and run the CRA frontend | `.github/workflows/frontend-ci.yml:L17`, `frontend/package.json:L9-L13` |
| PostgreSQL | Server version not pinned in code; reached through the `postgres`/`lib/pq` driver | Primary relational store (**Implemented**) | `backend/internal/db/postgres.go:L5,L15-L18` |
| Redis | Server version not pinned in code; reached through `go-redis/v8` | Cache and async status store (**Implemented**) | `backend/internal/db/redis.go:L5,L11-L18` |

Maturity of the prerequisite roles: the PostgreSQL and Redis clients are **Implemented** in `backend/internal/db` (Source: backend/internal/db/postgres.go:L12-L18, backend/internal/db/redis.go:L11-L18). The blockchain and custodian integrations referenced by the composition root are **Designed** — their packages (`internal/blockchain`, `internal/custodian`) are imported but absent from the tree (Source: backend/cmd/server/main.go:L8-L9).

## Get the Code

Clone the repository and enter the project directory. Replace the placeholder URL with your actual remote.

```bash
git clone https://github.com/your-org/blockchain-integration-service.git
cd blockchain-integration-service
```

## Backend (Go) Installation

From the backend module, compile all packages and run the composition root at `backend/cmd/server/main.go` (Source: backend/cmd/server/main.go:L17). The CI build step runs `go build -v ./...` (Source: .github/workflows/backend-ci.yml:L19).

```bash
cd backend
go build ./...
go run ./cmd/server
```

**Maturity: Designed.** There is no committed `go.mod`/`go.sum` anywhere in the repository, so `go build ./...` does not succeed as-is and the backend cannot yet be built or run end-to-end. Several imported packages are also absent from the tree: `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware` (Source: backend/cmd/server/main.go:L5-L12). The server binds a configurable address (`cfg.ServerAddress`) rather than a hard-coded port (Source: backend/cmd/server/main.go:L59-L60). For the full scaffold-versus-design reconciliation, see [scaffold-vs-design.md](../architecture/scaffold-vs-design.md) and [local-development.md](./local-development.md).

## Frontend (React / CRA) Installation

Install dependencies and start the Create React App dev server from the `frontend/` directory (Source: frontend/package.json:L20-L27).

```bash
cd frontend
npm install
npm start
```

The dev server serves the dashboard at `http://localhost:3000` (the Create React App default for `react-scripts start`) (Source: frontend/package.json:L21). A production bundle and the test runner are available through `npm run build` and `npm test` (Source: frontend/package.json:L22-L23).

**Maturity: Implemented (with caveat).** The frontend has no committed lockfile (`package-lock.json` is absent), so `npm install` works but the CI's `npm ci` step cannot resolve a lockfile (Source: .github/workflows/frontend-ci.yml:L18). The `npm ci` and lockfile discussion is covered in [local-development.md](./local-development.md).

## Corrected Setup (Replacing scripts/setup.sh)

The repository ships a bootstrap script, `scripts/setup.sh`, but it is **Designed/inaccurate** — it still carries `HUMAN ASSISTANCE NEEDED` markers and does not reflect this repository's actual stack. Use the corrected steps below rather than running it.

| # | Defect in `scripts/setup.sh` | Source | Corrected step |
|---|------------------------------|--------|----------------|
| 1 | Runs `npm install` at the repository root, but there is no root `package.json` | `scripts/setup.sh:L5` | Run `npm install` inside `frontend/` (see the Frontend track above) |
| 2 | Runs `cp .env.example .env`, but `.env.example` does not exist in the repository | `scripts/setup.sh:L9` | Create your own environment configuration — see [configuration.md](./configuration.md) |
| 3 | Shows a `mysql` database-init example, but the actual database is PostgreSQL | `scripts/setup.sh:L20` | Initialize a PostgreSQL database and role (example below) |

Initialize a local PostgreSQL database and role instead of the MySQL example. The backend connects with `sslmode=disable`, so a locally reachable instance is sufficient (Source: backend/internal/db/postgres.go:L15).

```bash
createdb blockchain_integration
psql -d blockchain_integration -c "CREATE ROLE app WITH LOGIN PASSWORD 'change-me';"
```

## Optional: Container-Based Setup

Dockerfiles exist for both services and provide the only concrete port bindings (**Provisioned**). The backend image is based on `golang:1.17-alpine` and exposes port 8080 (Source: infrastructure/docker/Dockerfile.backend:L2,L20); the frontend image is a `node:14` multi-stage build served by `nginx:alpine`, exposing port 80 (Source: infrastructure/docker/Dockerfile.frontend:L2,L20,L26).

**Maturity: Designed.** Both Dockerfiles `COPY` files that are absent from the repository — `go.mod`/`go.sum` (Source: infrastructure/docker/Dockerfile.backend:L8) and `package-lock.json` (Source: infrastructure/docker/Dockerfile.frontend:L8) — so an out-of-the-box `docker build` does not succeed. For full deployment topology and container detail, see [deployment.md](../guides/deployment.md).

## Next Steps

- [configuration.md](./configuration.md) — environment variables, database DSN, Redis, and JWT connection settings.
- [local-development.md](./local-development.md) — the developer workflow and build caveats (no `go.mod`, no lockfile).
- [index.md](../index.md) — documentation home and full navigation.
