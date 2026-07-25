# Installation

This page lists the prerequisites and walks through the two install tracks — the Go/Gin backend and the React 18 + TypeScript frontend — needed to obtain a local checkout of the Blockchain Integration Service and Dashboard. It also corrects the inaccurate `scripts/setup.sh` bootstrap script and records the build reality honestly using maturity labels (**Implemented**, **Source-present (non-buildable)**, **Provisioned**, **Designed**), identical to the [Maturity Legend](../architecture/scaffold-vs-design.md#maturity-legend). Environment configuration is covered in [configuration.md](./configuration.md); the day-to-day developer workflow and build caveats are covered in [local-development.md](./local-development.md).

## System Stack

The system is a custodial blockchain integration platform composed of two deployable units:

- **Backend** — a Go service built on the Gin web framework (Source: backend/cmd/server/main.go:L4), persisting to **PostgreSQL** through the `lib/pq` driver (Source: backend/internal/db/postgres.go:L5,L18) and to **Redis** through `go-redis/v8` (Source: backend/internal/db/redis.go:L5).
- **Frontend** — a **React 18.2.0** single-page dashboard written in TypeScript and built with Create React App (`react-scripts` 5.0.1) (Source: frontend/package.json:L9-L13). Create React App was deprecated by the React team on 2025-02-14 and is in maintenance mode; more importantly, the frontend does **not** build or serve against the repository as-is (undeclared dependencies, absent store slices/hooks/utilities/types, and export/import mismatches) — see the [Frontend (React / CRA) Installation](#frontend-react--cra-installation) compile-blocker set and [local-development.md](./local-development.md) for the full detail.

This documentation describes the repository as it exists on disk. A capability is labeled **Implemented** only when it is present AND compiles AND runs today — a bar nothing in this repository meets at this checkpoint, because the backend has no `go.mod` and the frontend does not build cleanly. Code that is written out but does not compile is **Source-present (non-buildable)**; container or infrastructure definitions that exist and would validly apply are **Provisioned**; capabilities that are referenced or intended but absent from the tree are **Designed**.

## Prerequisites

Install the following tooling before starting either track. The versions reflect what the repository's CI and container definitions actually declare.

| Tool | Version | Why | Source |
|------|---------|-----|--------|
| Go | `1.20` in CI; `1.17` in the backend Docker image (**discrepancy**). To reproduce CI exactly, install Go **1.20** specifically; for a *supported* toolchain use Go **1.25 or 1.26** (Go supports only its two newest majors, so 1.20 is end-of-life and receives no fixes) | Compile and run the Gin backend | `.github/workflows/backend-ci.yml:L17`, `infrastructure/docker/Dockerfile.backend:L2`; Go lifecycle: go.dev/doc/devel/release |
| Node.js + npm | `14.x` in CI; the CI-pinned Node 14 reached end-of-life on 2023-04-30, so use a currently supported LTS locally (**Node 22 or 24**; Node 18 and 20 have also reached end-of-life) | Build and run the CRA frontend | `.github/workflows/frontend-ci.yml:L17`, `frontend/package.json:L9-L13`; Node.js lifecycle: nodejs.org/en/about/previous-releases |
| PostgreSQL | Server version not pinned in code; reached through the `postgres`/`lib/pq` driver | Primary relational store (**Source-present (non-buildable)**) | `backend/internal/db/postgres.go:L5,L15-L18` |
| Redis | Server version not pinned in code; reached through `go-redis/v8` | Cache and async status store (**Source-present (non-buildable)**) | `backend/internal/db/redis.go:L5,L11-L18` |

Maturity of the prerequisite roles: the PostgreSQL and Redis client code is written out in `backend/internal/db` (Source: backend/internal/db/postgres.go:L12-L18, backend/internal/db/redis.go:L11-L18), but because the backend has no `go.mod` and imports absent packages it does not compile, so these clients are **Source-present (non-buildable)** rather than Implemented — none of their connection logic can be observed to run. The blockchain and custodian integrations referenced by the composition root are **Designed** — their packages (`internal/blockchain`, `internal/custodian`) are imported but absent from the tree (Source: backend/cmd/server/main.go:L8-L9).

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

**Maturity: Designed.** There is no committed `go.mod`/`go.sum` anywhere in the repository, so `go build ./...` does not succeed as-is and the backend cannot yet be built or run end-to-end. Several imported packages are also absent from the tree: `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware` (Source: backend/cmd/server/main.go:L5-L12). The server is coded to bind a configurable address (`cfg.ServerAddress`) rather than a hard-coded port (Source: backend/cmd/server/main.go:L59-L60), though this cannot run until the module exists. For the full scaffold-versus-design reconciliation, see [scaffold-vs-design.md](../architecture/scaffold-vs-design.md) and [local-development.md](./local-development.md).

> **Supply-chain note.** With no `go.mod`/`go.sum`, backend dependencies are neither pinned nor checksum-verified: builds are not reproducible and no integrity or vulnerability audit (`go mod verify`, `govulncheck`) is possible. When you author a module locally, do so in an isolated environment, pin explicit versions, and commit the generated `go.sum` before trusting any resolved dependency set.

## Frontend (React / CRA) Installation

The `frontend/` directory contains a Create React App project (Source: frontend/package.json:L20-L27), but **it does not build or serve against the repository as-is.** Read the compile-blocker set below *before* running any command — the commands are shown for completeness and for use only after these blockers are resolved; none of them will produce a running dashboard today.

> **Frontend compile blockers (complete set — the app will NOT build until all are resolved).** The following are the reasons `npm install && npm start` (or `npm run build`) cannot produce a working build; each is **Designed**/absent or a **Source-present (non-buildable)** defect:
> - **Undeclared dependencies.** The source imports Redux Toolkit, `react-redux`, Zod, Axios, and Chart.js, but none are declared in `package.json`, so a clean install does not obtain them. `Source: frontend/src/store/index.ts:L1`, `Source: frontend/src/schema/transaction.ts:L1`, `Source: frontend/src/services/api.ts:L1`, `Source: frontend/package.json`
> - **Absent store slices / typed hooks.** Pages import Redux slices and typed hooks that the store does not export (for example the Analytics page references a slice not registered in the store, which registers only `vault`, `transaction`, and `user`). `Source: frontend/src/store/index.ts:L8-L12`
> - **Absent utilities and types, and export/import mismatches.** Modules import utilities, types, and named exports that are not defined in the tree, so type-checking and bundling fail.
> - **No committed lockfile.** `package-lock.json` is absent, so CI's `npm ci` cannot run (Source: .github/workflows/frontend-ci.yml:L18); a local `npm install` generates a lockfile but does **not** supply the undeclared dependencies or the absent modules above, so `npm install` alone cannot make the app build.
> - **CRA/`tsconfig` toolchain mismatch.** Documented in [local-development.md](./local-development.md).

> **Create React App is deprecated (maintenance mode).** The React team deprecated Create React App for new applications on 2025-02-14; it has no active maintainers and the team recommends migrating to a framework or to a build tool such as Vite, Parcel, or RSBuild. `Source: React Blog, "Sunsetting Create React App" — react.dev/blog/2025/02/14/sunsetting-create-react-app`. This repository pins `react-scripts` 5.0.1 (`Source: frontend/package.json:L13`); any migration off CRA is **Designed** — no alternative build tool is present in the tree today.

```bash
cd frontend
npm install   # generates a lockfile but does NOT resolve the undeclared deps / absent modules above
npm start     # will NOT serve a dashboard until every compile blocker above is resolved
```

On a working build, `react-scripts start` would serve the dashboard at `http://localhost:3000` and `npm run build`/`npm test` would produce a bundle and run tests (Source: frontend/package.json:L21-L23) — but because the compile blockers above are unresolved, **none of these behaviors is available today**; no frontend runtime behavior is claimed here as Implemented.

**Maturity: Source-present (non-buildable) as-is.** **Supply-chain note:** without a committed `package-lock.json`, installs are not reproducible and `npm ci`/`npm audit` cannot verify integrity against a locked baseline — install in an isolated environment and commit the generated lockfile (and run `npm audit`) before trusting the resolved dependency set. The `npm ci` and lockfile discussion is covered in [local-development.md](./local-development.md).

## Corrected Setup (Replacing scripts/setup.sh)

The repository ships a bootstrap script, `scripts/setup.sh`, but it is **Designed/inaccurate** — it still carries `HUMAN ASSISTANCE NEEDED` markers and does not reflect this repository's actual stack. Use the corrected steps below rather than running it.

| # | Defect in `scripts/setup.sh` | Source | Corrected step |
|---|------------------------------|--------|----------------|
| 1 | Runs `npm install` at the repository root, but there is no root `package.json` | `scripts/setup.sh:L5` | Run `npm install` inside `frontend/` (see the Frontend track above) |
| 2 | Runs `cp .env.example .env`, but `.env.example` does not exist in the repository | `scripts/setup.sh:L9` | Create your own environment configuration — see [configuration.md](./configuration.md) |
| 3 | Shows a `mysql` database-init example, but the actual database is PostgreSQL | `scripts/setup.sh:L20` | Initialize a PostgreSQL database and role (example below) |

Initialize a local PostgreSQL database and role instead of the MySQL example. The backend connects with `sslmode=disable`, so a locally reachable instance is sufficient (Source: backend/internal/db/postgres.go:L15).

Create the application **role first**, then create the database **owned by** that role, and only then set the role's password through psql's interactive `\password` prompt. Creating the role before the database lets you make the role the database owner in a single step (`createdb -O`), so the application role has full rights on its own database from the outset; creating the database first (as a naive example might) would leave it owned by your admin/superuser role with no privileges granted to the application role. Passing a literal password in the command text (for example `... PASSWORD 'change-me'`) would leak the secret into your shell history and into process listings (`ps`), so it is deliberately avoided here; `\password` reads the secret without echoing it and never places it in `argv` or history.

```bash
psql -d postgres -c "CREATE ROLE app WITH LOGIN;"                 # 1) role first (connect to the default maintenance DB)
createdb -O app blockchain_integration                            # 2) database OWNED BY the app role
psql -d blockchain_integration -c "GRANT ALL PRIVILEGES ON DATABASE blockchain_integration TO app;"   # 3) explicit grant
psql -d blockchain_integration     # 4) then, at the interactive prompt:  \password app   (enter secret; not echoed)  →  \q
```

Choose a strong, unique password when prompted; the role name `app` is illustrative and must match the `DBUser` value in your [configuration.md](./configuration.md) settings. On a fresh instance you may need to run these commands as the `postgres` superuser (for example prefixed with `sudo -u postgres`).

## Optional: Container-Based Setup

Dockerfiles exist for both services and are the only place an intended port is declared (**Provisioned**). The backend image is based on `golang:1.17-alpine` and declares its intended port with `EXPOSE 8080` (Source: infrastructure/docker/Dockerfile.backend:L2,L20); the frontend image is a `node:14` multi-stage build served by `nginx:alpine` and declares `EXPOSE 80` (Source: infrastructure/docker/Dockerfile.frontend:L2,L20,L26).

> **What `EXPOSE` does (and does not) do.** Docker `EXPOSE` is documentation metadata: it records the port a container *intends* to listen on for tooling and inter-container discovery, and it is the set of ports published when you run with `docker run -P` (publish-all). It does **not** by itself bind a host port, publish the port, or start a listener — publishing requires an explicit `-p host:container` (or `-P`) at run time, and traffic is only served if a process inside the container is actually listening on that port. Because these images do not build as-is (see the Maturity note below), no listener runs today regardless of the `EXPOSE` declarations.

**Maturity: Designed.** Both Dockerfiles `COPY` files that are absent from the repository — `go.mod`/`go.sum` (Source: infrastructure/docker/Dockerfile.backend:L8) and `package-lock.json` (Source: infrastructure/docker/Dockerfile.frontend:L8) — so an out-of-the-box `docker build` does not succeed. For full deployment topology and container detail, see [deployment.md](../guides/deployment.md).

## Next Steps

- [configuration.md](./configuration.md) — environment variables, database DSN, Redis, and JWT connection settings.
- [local-development.md](./local-development.md) — the developer workflow and build caveats (no `go.mod`, no lockfile).
- [index.md](../index.md) — documentation home and full navigation.
