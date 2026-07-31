# Installation

This page lists the prerequisites and walks through the two install tracks — the Go/Gin backend and the React 18 + TypeScript frontend — needed to obtain a local checkout of the Blockchain Integration Service and Dashboard. It also corrects the inaccurate `scripts/setup.sh` bootstrap script and records the build reality honestly using maturity labels (**Implemented**, **Source-present (non-buildable)**, **Provisioned**, **Designed**), identical to the [Maturity Legend](../architecture/scaffold-vs-design.md#maturity-legend). Environment configuration is covered in [configuration.md](./configuration.md); the day-to-day developer workflow and build caveats are covered in [local-development.md](./local-development.md).

## System Stack

The system is a custodial blockchain integration platform composed of two deployable units:

- **Backend** — a Go service built on the Gin web framework (Source: backend/cmd/server/main.go:L4), persisting to **PostgreSQL** through the `lib/pq` driver (Source: backend/internal/db/postgres.go:L5,L18) and to **Redis** through `go-redis/v8` (Source: backend/internal/db/redis.go:L5).
- **Frontend** — a **React 18.2.0** single-page dashboard written in TypeScript and built with Create React App (`react-scripts` 5.0.1) (Source: frontend/package.json:L9-L13). Create React App was deprecated by the React team on 2025-02-14 and is in maintenance mode; more importantly, the frontend does **not** build against the repository as-is and therefore serves no dashboard (undeclared dependencies, absent store slices/hooks/utilities/types, and export/import mismatches) — see the [Frontend (React / CRA) Installation](#frontend-react--cra-installation) compile-blocker set and [local-development.md](./local-development.md) for the full detail.

This documentation describes the repository as it exists on disk. A capability is labeled **Implemented** only when it is present AND compiles AND runs today — a bar nothing in this repository meets at this checkpoint, because the backend has no `go.mod` and the frontend does not build cleanly. Code that is written out but does not compile is **Source-present (non-buildable)**; container or infrastructure definitions that exist and would validly apply are **Provisioned**; capabilities that are referenced or intended but absent from the tree are **Designed**.

## Prerequisites

Install the following tooling before starting either track. The versions reflect what the repository's CI and container definitions actually declare.

| Tool | Version | Why | Source |
|------|---------|-----|--------|
| Go | `1.20` in CI; `1.17` in the backend Docker image (**discrepancy**). To reproduce CI exactly, install Go **1.20** specifically; for a *supported* toolchain use a release inside Go's two-newest-majors support window, which held **Go 1.25 and 1.26 as verified on 2026-07-22** (so 1.20 is end-of-life and receives no fixes). The window advances with each major release — re-check the policy page rather than treating these numbers as fixed | Compile and run the Gin backend | `.github/workflows/backend-ci.yml:L17`, `infrastructure/docker/Dockerfile.backend:L2`; Go lifecycle: go.dev/doc/devel/release (supported majors verified 2026-07-22) |
| Node.js + npm | `14.x` in CI; the CI-pinned Node 14 reached end-of-life on 2023-04-30, so use a release still inside its support window locally — **as verified on 2026-07-22 that meant Node 24 (Active LTS) or Node 22 (Maintenance LTS)**, Node 20 having reached end-of-life on 2026-04-30 and Node 18 on 2025-04-30. Support windows advance on a published schedule, so re-check the release table | Build and run the CRA frontend | `.github/workflows/frontend-ci.yml:L17`, `frontend/package.json:L9-L13`; Node.js lifecycle: nodejs.org/en/about/previous-releases (support status verified 2026-07-22) |
| PostgreSQL | Server version not pinned in code; reached through the `postgres`/`lib/pq` driver | Primary relational store (**Source-present (non-buildable)**) | `backend/internal/db/postgres.go:L5,L15-L18` |
| Redis | Server version not pinned in code; reached through `go-redis/v8` | Cache and async status store (**Source-present (non-buildable)**) | `backend/internal/db/redis.go:L5,L11-L18` |
| golangci-lint | `v1.50.1`, the exact version CI installs | Run the backend lint gate (`golangci-lint run`) locally before pushing, matching CI | `.github/workflows/backend-ci.yml:L41,L43` |

The golangci-lint row is needed only for the backend lint gate, not to build or run the service — but installing it locally is what lets you reproduce the third CI job instead of discovering its findings after a push. CI installs it by piping the upstream installer to `sh` with the version pinned as an argument: `curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.50.1` (Source: .github/workflows/backend-ci.yml:L41). Note that the installer script itself is fetched from the `master` branch rather than a tagged revision, so the *installer* floats even though the *linter version* it installs is pinned — the same class of reproducibility gap as the floating and end-of-life container base images recorded in [deployment.md](../guides/deployment.md#troubleshooting). The lint job cannot pass against the repository as-is regardless, because the backend has no `go.mod` (see [Build Caveats](./local-development.md#build-caveats), Caveat 1), so treat local golangci-lint as **Designed** tooling: installable today, but with nothing it can successfully analyze until the Go module exists. The workflow itself is walked through in [development.md](../contributing/development.md).

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

The `frontend/` directory contains a Create React App project (Source: frontend/package.json:L20-L27), but **it does not build against the repository as-is, so it serves no dashboard.** Read the compile-blocker set below *before* running any command — the commands are shown for completeness and for use only after these blockers are resolved; none of them will produce a running dashboard today.

> **Frontend compile blockers (complete set — the app will NOT build until all are resolved).** The following are the reasons `npm install && npm start` (or `npm run build`) cannot produce a working build; each is **Designed**/absent or a **Source-present (non-buildable)** defect:
> - **Undeclared dependencies — all seven of them.** The source imports `@reduxjs/toolkit`, `axios`, `chart.js`, `date-fns`, `react-chartjs-2`, `react-redux`, and `zod`, and **not one of the seven is declared in `package.json`**, so a clean install does not obtain them. `Source: frontend/src/store/index.ts:L1`, `Source: frontend/src/schema/transaction.ts:L1`, `Source: frontend/src/services/api.ts:L1`, `Source: frontend/src/components/Chart.tsx:L2-L3`, `Source: frontend/src/utils/formatters.ts:L1`, `Source: frontend/package.json:L5-L19`. Count them when you reconcile the manifest: `date-fns` is imported only by `utils/formatters`, which three rendered components consume, so it is the one most often missed from a hand-written dependency list even though it blocks a reachable path. `Source: frontend/src/utils/formatters.ts:L1`, `Source: frontend/src/components/TransactionList.tsx:L4`
> - **Absent store slices / typed hooks.** Pages import Redux slices and typed hooks that the store does not export (for example the Analytics page references a slice not registered in the store, which registers only `vault`, `transaction`, and `user`). `Source: frontend/src/store/index.ts:L8-L12`
> - **Absent utilities and types, and export/import mismatches.** Modules import utilities, types, and named exports that are not defined in the tree, so type-checking and bundling fail.
> - **No committed lockfile.** `package-lock.json` is absent, so CI's `npm ci` cannot run (Source: .github/workflows/frontend-ci.yml:L18); a local `npm install` generates a lockfile but does **not** supply the undeclared dependencies or the absent modules above, so `npm install` alone cannot make the app build. (In CI the step never even reaches the lockfile check: no job declares a working directory, so `npm ci` runs at the repository root where there is no `package.json` at all. Source: .github/workflows/frontend-ci.yml:L18,L29,L40 — no `working-directory` or `defaults` key. This is a CI-configuration defect, catalogued as Limitation 5 in [../contributing/development.md](../contributing/development.md#known-limitations); it does not affect the local commands below, which are run from inside `frontend/`.)
> - **CRA/`tsconfig` toolchain mismatch.** Documented in [local-development.md](./local-development.md).

> **Create React App is deprecated (maintenance mode).** The React team deprecated Create React App for new applications on 2025-02-14; it has no active maintainers and the team recommends migrating to a framework or to a build tool such as Vite, Parcel, or RSBuild. `Source: React Blog, "Sunsetting Create React App" — react.dev/blog/2025/02/14/sunsetting-create-react-app`. This repository pins `react-scripts` 5.0.1 (`Source: frontend/package.json:L12`); any migration off CRA is **Designed** — no alternative build tool is present in the tree today.

```bash
cd frontend
npm install   # generates a lockfile but does NOT resolve the undeclared deps / absent modules above
npm start     # will NOT serve a dashboard until every compile blocker above is resolved
```

On a working build, `react-scripts start` would serve the dashboard at `http://localhost:3000` and `npm run build`/`npm test` would produce a bundle and run tests (Source: frontend/package.json:L21-L23) — but because the compile blockers above are unresolved, **none of these behaviors is available today**; no frontend runtime behavior is claimed here as Implemented. Be precise about what "not available" means, because the dev server is not silent: `npm start` **does** start and answers `GET http://localhost:3000/` with HTTP 200 and the ~546-byte static shell, while the bundle fails to compile — the browser shows the dev-server overlay `Compiled with problems:` with four `Module not found` errors, `<div id="root">` stays empty, and no dashboard appears. `npm run build` exits 1 (`Can't resolve '@/services/auth'`), and `npm test` exits 1 for a *different* reason: there are no test files. The full measured behavior of each script is documented in [local-development.md](./local-development.md#frontend-development-workflow-react--cra). (Source: frontend/src/index.tsx:L3-L6, frontend/public/index.html:L1-L15)

**Maturity: Source-present (non-buildable) as-is.** **Supply-chain note:** without a committed `package-lock.json`, installs are not reproducible and `npm ci`/`npm audit` cannot verify integrity against a locked baseline — install in an isolated environment and commit the generated lockfile (and run `npm audit`) before trusting the resolved dependency set. The `npm ci` and lockfile discussion is covered in [local-development.md](./local-development.md).

## Corrected Setup (Replacing scripts/setup.sh)

The repository ships a bootstrap script, `scripts/setup.sh`, but it is **Designed/inaccurate** — it still carries `HUMAN ASSISTANCE NEEDED` markers and does not reflect this repository's actual stack. Use the corrected steps below rather than running it.

| # | Defect in `scripts/setup.sh` | Source | Corrected step |
|---|------------------------------|--------|----------------|
| 1 | Runs `npm install` at the repository root, but there is no root `package.json` | `scripts/setup.sh:L5` | Run `npm install` inside `frontend/` (see the Frontend track above) |
| 2 | Runs `cp .env.example .env`, but `.env.example` does not exist in the repository | `scripts/setup.sh:L9` | Create your own environment configuration — see [configuration.md](./configuration.md) |
| 3 | Shows a `mysql` database-init example, but the actual database is PostgreSQL | `scripts/setup.sh:L20` | Initialize a PostgreSQL database and role (example below) |
| 4 | **Reports success even when every real step fails.** The script sets no `set -e` and checks no exit status, so defects 1 and 2 are silently ignored: the run continues past both failures and terminates with exit code **0**, whose final line of output is `Setup complete!` | `scripts/setup.sh:L1-L2,L22` (no `set -e`; contrast `scripts/deploy.sh:L3`, which does set it) | Do not rely on the script's exit code or its closing message; follow the corrected steps below and verify each one yourself |
| 5 | **Leaves a stray `package-lock.json` at the repository root.** The failing root `npm install` from defect 1 still writes a minimal lockfile before erroring — a five-line stub holding only `name`, `lockfileVersion`, `requires`, and an empty `"packages": {}` object. **Quote no fixed byte count for it.** npm copies the `name` field from the working directory's own name, so the file measures **79 bytes plus the length of that directory name** — 86 B for a 7-character name, 108 B for a 29-character one, 129 B for a 50-character one — and any absolute figure is therefore true only for one checkout path, not for the artifact. Two further environment dependencies apply: under npm 11 the install walks *up* the tree, so if any **ancestor** directory holds a `package.json` the command targets that project and writes no root lockfile here at all; and the stub is written by `npm install`, not by the `cp .env.example .env` failure that ends the script, so it survives the script's non-zero exit. Because the repository ships no `.gitignore`, whatever is written lands in `git status` as an untracked artifact | `scripts/setup.sh:L5` | Delete the stray root `package-lock.json` if you ran the script; the only lockfile this project should have is `frontend/package-lock.json` |

The failure mode in defect 4 is the consequential one, because it inverts the signal a bootstrap script exists to give. Running `bash scripts/setup.sh` on a clean checkout emits two failures on **stderr** — `npm error code ENOENT` / `Could not read package.json` from the root `npm install`, then `cp: cannot stat '.env.example': No such file or directory` — while **stdout** shows an uninterrupted sequence of progress messages ending in `Setup complete!`, and `$?` is `0`. Nothing is installed and no `.env` is created. A developer watching stdout, or any wrapper that branches on the exit code, will conclude the environment is ready when it is not. The stray lockfile in defect 5 carries a `name` field derived from the *containing directory* rather than from the project — so its exact byte size shifts with the length of your checkout's directory name — which is a further sign it is an accident of the failed install rather than a real artifact.

> **Neither script is executable; invoke both through `bash`.** `scripts/setup.sh` and `scripts/deploy.sh` are committed with mode `100644`, not `100755` — the executable bit is absent from the git index itself, so it is missing in every fresh clone rather than being a local permissions quirk. `Source: scripts/setup.sh (git index mode 100644)`, `Source: scripts/deploy.sh (git index mode 100644)`. Invoking either directly fails before a single line runs: `./scripts/setup.sh` exits **126** with `bash: ./scripts/setup.sh: Permission denied`, and `./scripts/deploy.sh` behaves identically. Both files do carry a `#!/bin/bash` shebang (`Source: scripts/setup.sh:L1`, `Source: scripts/deploy.sh:L1`) and both are syntactically valid (`bash -n` exits **0** for each), so passing the file to an interpreter — `bash scripts/setup.sh` — runs correctly; only the direct `./` form is blocked. Every script invocation in this documentation therefore uses the `bash scripts/<name>.sh` form. Restoring the executable bit (`chmod +x`, or `git update-index --chmod=+x`) is **Designed** — this deliverable is documentation-only and does not modify the scripts or their modes.

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

> **Base images are pinned by mutable tag, not by digest.** All three `FROM` instructions name a tag only and **none** carries a `sha256:` digest (Source: infrastructure/docker/Dockerfile.backend:L2, infrastructure/docker/Dockerfile.frontend:L2,L20). Because tags are mutable pointers, the same Dockerfile can resolve different base layers — and different OS packages and CVE exposure — on different days with no repository change. `golang:1.17-alpine` fixes the Go minor line, `node:14` fixes only the Node major, and `nginx:alpine` fixes **nothing version-related at all**, making the frontend's runtime web server whatever upstream published most recently. Digest pinning is **Designed**; the per-image breakdown is in [deployment.md](../guides/deployment.md#troubleshooting).

**Maturity: Designed.** Both Dockerfiles `COPY` files that are absent from the repository — `go.mod`/`go.sum` (Source: infrastructure/docker/Dockerfile.backend:L8) and `package-lock.json` (Source: infrastructure/docker/Dockerfile.frontend:L8) — so an out-of-the-box `docker build` does not succeed. For full deployment topology and container detail, see [deployment.md](../guides/deployment.md).

## Generated Artifacts and the Absent `.gitignore`

Every install step on this page writes files that should never be committed, and the repository ships **no `.gitignore` at any level** — a repository-wide `find` for `.gitignore` returns zero results (`Source: repository root and all subdirectories (no .gitignore present)`). Nothing is therefore ignored by default: each artifact below appears in `git status` as untracked, and a bulk `git add -A` or `git add .` would stage all of it, including the entire `node_modules` tree.

| Command from this page | Artifacts it creates | Location |
|------------------------|----------------------|----------|
| `npm install` (frontend track) | `node_modules/` (roughly 875 top-level entries) and `package-lock.json` (roughly 763 KB) | `frontend/` |
| Environment configuration ([configuration.md](./configuration.md)) | `.env` holding real secrets — a JWT signing key and the database password | `frontend/` and/or `backend/` |
| `bash scripts/setup.sh` | a stray minimal `package-lock.json` from the failing root `npm install` — a ~100-byte stub whose exact size tracks the working directory's name length, so no fixed byte count is quoted; see defect 5 above | repository **root** |
| `go build` / `go run` (backend track) | compiled binaries and Go build cache entries | `backend/` |
| `terraform init` ([deployment.md](../guides/deployment.md)) | `.terraform/` (downloaded providers), `.terraform.lock.hcl`, and any local `terraform.tfstate` | `infrastructure/terraform/` |

The `.env` and `terraform.tfstate` rows are the dangerous ones: both hold plaintext credentials — the JWT signing key and database password in the former, and (for a local backend) the RDS master password in the latter, as catalogued in gap TF-4 of [deployment.md](../guides/deployment.md#terraform-security-and-data-loss-gaps). Committing either exposes a live secret in immutable git history.

Until a `.gitignore` exists, **stage changes explicitly by path** — `git add docs/getting-started/installation.md`, never `git add -A` — and read `git status` before every commit. **Maturity: Designed.** Authoring a `.gitignore` is not part of this documentation-only deliverable, so the gap is disclosed here rather than closed; the same caveat appears as [Build Caveat 6](./local-development.md#6-no-gitignore-generated-artifacts-are-untracked-and-un-ignored) and in the [contributing guide](../contributing/development.md#known-limitations).

## Next Steps

- [configuration.md](./configuration.md) — environment variables, database DSN, Redis, and JWT connection settings.
- [local-development.md](./local-development.md) — the developer workflow and build caveats (no `go.mod`, no lockfile).
- [index.md](../index.md) — documentation home and full navigation.
