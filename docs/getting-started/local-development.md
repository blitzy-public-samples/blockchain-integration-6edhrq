# Local Development

This page documents the day-to-day development loop for both stacks of the Blockchain Integration Service and Dashboard — the Go/Gin backend and the React 18 + TypeScript (Create React App) frontend — and summarizes the GitHub Actions continuous-integration pipeline that runs on each push and pull request. Prerequisites and the install tracks are covered in [installation.md](./installation.md), and environment configuration is covered in [configuration.md](./configuration.md). Critically, this page also records the honest **build caveats** that mean the repository does not build cleanly as-is; each caveat is cited and labeled with the project-wide maturity discipline (**Implemented**, **Provisioned**, **Designed**).

## Backend Development Workflow (Go)

The backend is a Go/Gin service whose composition root is `backend/cmd/server/main.go`. `Source: backend/cmd/server/main.go:L17`. The inner development loop runs the server locally, compiles every package, and executes the test suite — the same `go build` and `go test` invocations the CI build and test jobs use. `Source: .github/workflows/backend-ci.yml:L18-L19,L29-L30`.

```bash
go run ./cmd/server   # run the composition root locally
go build ./...        # compile every package
go test ./...         # run the backend test suite
```

Run these commands from the `backend/` directory. Static analysis is performed with `golangci-lint`, matching the CI lint job, which installs `golangci-lint` v1.50.1 and then runs `golangci-lint run`. `Source: .github/workflows/backend-ci.yml:L40-L43`.

```bash
golangci-lint run     # static analysis (matches the CI lint job)
```

The test suite targets the five test files under `backend/tests/` — `api_test.go`, `blockchain_test.go`, `custodian_test.go`, `db_test.go`, and `service_test.go`. `Source: backend/tests/ (api_test.go, blockchain_test.go, custodian_test.go, db_test.go, service_test.go)`. The full testing strategy and coverage targets live in [testing.md](../contributing/testing.md); this page does not duplicate them. Note that the backend does not build as-is — see [Build Caveats](#build-caveats) below.

## Frontend Development Workflow (React / CRA)

The frontend is a Create React App project; its `start`, `build`, `test`, and `eject` scripts delegate to `react-scripts`, while `lint` runs `eslint src` and `format` runs `prettier --write src`. `Source: frontend/package.json:L20-L27`. The stack is React 18.2.0 with `react-scripts` 5.0.1. `Source: frontend/package.json:L9-L13`. The inner loop installs dependencies, starts the dev server, and produces a production bundle.

```bash
npm install           # install dependencies (generates a lockfile)
npm start             # CRA dev server at http://localhost:3000
npm run build         # production bundle
```

The `react-scripts start` dev server serves the dashboard at `http://localhost:3000` (the Create React App default). `Source: frontend/package.json:L21`. Testing, linting, and formatting use the remaining scripts.

```bash
npm test              # react-scripts test runner
npm run lint          # eslint src
npm run format        # prettier --write src
```

Run these commands from the `frontend/` directory. `Source: frontend/package.json:L20-L27`.

## Continuous Integration Overview

Two GitHub Actions workflows run on each push and pull request targeting `main` — one per stack. `Source: .github/workflows/backend-ci.yml:L3-L7`, `Source: .github/workflows/frontend-ci.yml:L3-L7`. The backend workflow pins Go `1.20`. `Source: .github/workflows/backend-ci.yml:L17`. The frontend workflow pins Node `14.x` and runs `npm ci` before each job. `Source: .github/workflows/frontend-ci.yml:L17,L18`. Each stack defines three jobs — build, test, and lint — summarized below.

| Stack | Job | Command | Source |
|-------|-----|---------|--------|
| Backend (Go) | build | `go build -v ./...` | `.github/workflows/backend-ci.yml:L18-L19` |
| Backend (Go) | test | `go test -v ./...` | `.github/workflows/backend-ci.yml:L29-L30` |
| Backend (Go) | lint | install + `golangci-lint run` (v1.50.1) | `.github/workflows/backend-ci.yml:L40-L43` |
| Frontend (CRA) | build | `npm ci` then `npm run build` | `.github/workflows/frontend-ci.yml:L18-L19` |
| Frontend (CRA) | test | `npm ci` then `npm test` | `.github/workflows/frontend-ci.yml:L29-L30` |
| Frontend (CRA) | lint | `npm ci` then `npm run lint` | `.github/workflows/frontend-ci.yml:L40-L41` |

The contribution workflow and CI walkthrough are documented in [development.md](../contributing/development.md), and the test strategy is documented in [testing.md](../contributing/testing.md); this overview does not duplicate them. As the [Build Caveats](#build-caveats) explain, several of these jobs cannot pass against the repository as-is.

## Build Caveats

The repository does not build cleanly as-is. The four caveats below are the core reason a fresh checkout will not pass CI or produce a runnable binary or bundle without changes. Each is cited and labeled with the project-wide maturity discipline, and a practical workaround is given where one exists. The complete Implemented/Provisioned/Designed reconciliation and the full defect catalog live in [scaffold-vs-design.md](../architecture/scaffold-vs-design.md).

### 1. No committed Go module (`go.mod` / `go.sum`)

There is no `go.mod` or `go.sum` anywhere in the repository, so the backend is not a Go module and neither `go build -v ./...` nor `go test -v ./...` — the commands the CI build and test jobs run — can succeed as-is. `Source: .github/workflows/backend-ci.yml:L19,L30`. Several packages imported by the composition root are also absent from the tree: `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware`. `Source: backend/cmd/server/main.go:L6,L8-L10,L12`. **Maturity: Designed** — the scaffold does not build. Workaround: a `go.mod` must be authored (and the absent packages supplied) before the backend can build; the full inventory is catalogued in [scaffold-vs-design.md](../architecture/scaffold-vs-design.md).

### 2. No frontend lockfile, but CI runs `npm ci`

The frontend has no committed lockfile (`package-lock.json` is absent), yet every frontend CI job runs `npm ci`. `Source: .github/workflows/frontend-ci.yml:L18`, `Source: frontend/package.json`. Because `npm ci` installs strictly from an existing lockfile, every frontend job fails at that step against the repository as-is. **Maturity: Designed / broken CI step.** Workaround: locally, use `npm install` (which resolves dependencies and generates a `package-lock.json`) rather than `npm ci`.

### 3. TypeScript config versus the CRA toolchain

`frontend/tsconfig.json` sets `moduleResolution: "bundler"`, together with `allowImportingTsExtensions: true` and `noEmit: true` — a Vite/bundler-oriented configuration. `Source: frontend/tsconfig.json:L8-L9,L12`. The project, however, builds with Create React App (`react-scripts`), a webpack toolchain that expects `moduleResolution: "node"`. `Source: frontend/package.json:L12`. The mismatch can cause type-resolution friction under `react-scripts`. TypeScript is also not declared as a dependency in `frontend/package.json` even though a `tsconfig.json` is present. `Source: frontend/package.json:L5-L19`. **Maturity: Provisioned / inconsistent** — the config is present but misaligned with the actual toolchain. Workaround: in your own environment, align `moduleResolution` to `"node"` for CRA and add a pinned `typescript` dependency.

### 4. Go version discrepancy (CI versus Docker)

The backend CI pins Go `1.20`, while the backend Docker image is based on `golang:1.17-alpine`. `Source: .github/workflows/backend-ci.yml:L17`, `Source: infrastructure/docker/Dockerfile.backend:L2`. The two toolchains disagree, which undermines build reproducibility between CI and the container image. **Maturity: Provisioned / inconsistent** — both artifacts exist but pin different versions. Workaround: use Go 1.20+ locally to match CI.

## Cross References and Next Steps

- [installation.md](./installation.md) — prerequisites and the backend/frontend install tracks.
- [configuration.md](./configuration.md) — environment variables, database DSN, Redis, and JWT settings.
- [development.md](../contributing/development.md) — contribution workflow and the fuller CI walkthrough.
- [testing.md](../contributing/testing.md) — test strategy and coverage targets.
- [scaffold-vs-design.md](../architecture/scaffold-vs-design.md) — the complete Implemented/Provisioned/Designed reconciliation and defect catalog.
- [index.md](../index.md) — documentation home and full navigation.
