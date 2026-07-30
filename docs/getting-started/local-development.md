# Local Development

This page documents the day-to-day development loop for both stacks of the Blockchain Integration Service and Dashboard — the Go/Gin backend and the React 18 + TypeScript (Create React App) frontend — and summarizes the GitHub Actions continuous-integration pipeline that runs on each push and pull request. Prerequisites and the install tracks are covered in [installation.md](./installation.md), and environment configuration is covered in [configuration.md](./configuration.md). Critically, this page also records the honest **build caveats** that mean the repository does not build cleanly as-is; each caveat is cited and labeled with the project-wide maturity discipline (**Implemented**, **Source-present (non-buildable)**, **Provisioned**, **Designed**), identical to the [Maturity Legend](../architecture/scaffold-vs-design.md#maturity-legend). Because the backend has no `go.mod` and the frontend does not build cleanly, no runtime behavior on this page is claimed as Implemented.

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

> **The frontend does not build, and serves no dashboard, as-is.** Before running the commands below, note that a fresh checkout will **not** compile — the CRA dev server does start and serves the static shell, but the bundle never compiles, so no dashboard is rendered (measured behavior is detailed after the commands). The source imports dependencies that `package.json` does not declare (Redux Toolkit, `react-redux`, Zod, Axios, and Chart.js/`react-chartjs-2`), imports Redux slices and typed hooks the store does not export (for example the Analytics page imports `fetchAnalyticsData` from a `store/analyticsSlice` that does not exist, while the store registers only `vault`, `transaction`, and `user`), and has further absent utilities/types and export/import mismatches. `Source: frontend/src/store/index.ts:L1,L8-L12`, `Source: frontend/src/pages/Analytics.tsx:L6-L7`, `Source: frontend/src/services/api.ts:L1`, `Source: frontend/src/schema/transaction.ts:L1`, `Source: frontend/src/components/Chart.tsx:L2-L3`, `Source: frontend/package.json:L5-L19`. These source-level blockers are catalogued as [Build Caveat 3](#3-frontend-source-does-not-compile) and in [installation.md](./installation.md); the commands are shown for completeness and for use only after every blocker is resolved. **Maturity: Source-present (non-buildable).**

> **Create React App is deprecated.** On 2025-02-14 the React team officially deprecated Create React App for new applications; CRA now has no active maintainers and continues only in maintenance mode, and the team recommends migrating to a framework or to a build tool such as Vite, Parcel, or RSBuild. `Source: React Blog, "Sunsetting Create React App" — react.dev/blog/2025/02/14/sunsetting-create-react-app`. This repository's frontend is pinned to `react-scripts` 5.0.1 (`Source: frontend/package.json:L12`); any migration away from CRA is **Designed** (not present in the repository today). Treat CRA as a maintenance-mode dependency, not a forward-looking choice.

```bash
npm install           # generates a lockfile; does NOT supply the undeclared deps / absent modules — insufficient to build
npm start             # dev server DOES start and serves the CRA shell, but no dashboard — compile-error overlay only
npm run build         # FAILS (exit 1): Module not found — Can't resolve '@/services/auth'
```

The `npm start` script delegates to `react-scripts start`. `Source: frontend/package.json:L21`. On a working build, Create React App's `start` script serves the app on port `3000` by default (overridable via the `PORT` environment variable), so the dashboard would be reachable at `http://localhost:3000` unless `PORT` is set. `Source: Create React App docs, "Advanced Configuration" (PORT) — create-react-app.dev/docs/advanced-configuration`.

What actually happens today is more specific than "nothing runs", and the distinction matters when you interpret what the browser shows. **The dev server does start and does listen**: `GET http://localhost:3000/` answers **HTTP 200** with the ~546-byte static shell that Create React App serves from `frontend/public/index.html` (with the bundle `<script>` tag injected), because the CRA dev server deliberately serves the shell and reports compile failures *in the browser* rather than refusing to listen. `Source: frontend/public/index.html:L1-L15`, `Source: frontend/package.json:L21`. **What it serves is not the dashboard.** The terminal prints `Failed to compile.` followed by `webpack compiled with 4 errors`; the browser is covered by the webpack-dev-server overlay headed `Compiled with problems:`, listing four `Module not found` errors raised by `src/index.tsx` for `react-redux`, `@/app`, `@/store`, and `@/services/auth`; `<div id="root">` stays empty because module evaluation throws before `ReactDOM.render` is reached; the console shows `Uncaught Error: Cannot find module 'react-redux'`; and dismissing the overlay reveals a blank page. No navigation, vault list, transaction list, or chart renders, and — because evaluation aborts before any service module loads — **no API request is issued at all**. `Source: frontend/src/index.tsx:L3-L6,L16-L25`, `Source: frontend/src/store/index.ts:L8-L12`. **Maturity: Source-present (non-buildable)** — a served shell is not a running application, so no frontend runtime behavior is claimed as Implemented; the shell is also the reason the browser tab shows an unrelated product name (see [`../architecture/frontend.md`](../architecture/frontend.md#stale-product-identity-and-absent-cra-public-assets-source-present-defects)).

The remaining scripts do **not** all fail, and they do not all fail for the same reason — treat their exit codes individually rather than assuming the compile blockers stop everything:

```bash
npm test              # FAILS (exit 1): "No tests found" — zero test files, NOT a compile blocker
npm run lint          # SUCCEEDS (exit 0): eslint src reports 11 warnings, 0 errors
npm run format        # SUCCEEDS (exit 0): prettier --write src REWRITES the 27 tracked files under src/
```

Run these commands from the `frontend/` directory. `Source: frontend/package.json:L20-L27`. Two of the three are unaffected by the compile blockers because ESLint and Prettier parse each file independently and never resolve the module graph: `npm run lint` exits **0** with `11 problems (0 errors, 11 warnings)` — all `@typescript-eslint/no-unused-vars` — and `npm run format` exits **0**. `Source: frontend/package.json:L25-L26,L28-L33`. `npm test` exits **1**, but for a different cause than the compile blockers: CRA's Jest runner reports `No tests found, exiting with code 1` because `frontend/src` contains no test file, and it suggests `--passWithNoTests` to invert that. `Source: frontend/src/ (no *.test.tsx/*.spec.tsx present)`, `Source: frontend/package.json:L23`; see [testing.md](../contributing/testing.md) limitation 9. Only `npm run build` fails *because of* the compile blockers, exiting **1** at `Module not found: Error: Can't resolve '@/services/auth'`. `Source: frontend/src/index.tsx:L6`.

> **`npm run format` mutates your working tree.** The `format` script is `prettier --write src`, and `--write` rewrites files **in place**: on this repository it reformats all **27** committed files under `frontend/src`, so a clean checkout becomes a dirty working tree with 27 modified tracked files and no diff you authored. `Source: frontend/package.json:L26`, `Source: frontend/src/ (27 files)`. The rewrite is **convergent** — a second `npm run format` changes nothing further — so the risk is an unexpected diff rather than progressive churn. Review `git diff` before committing, and note that the repository ships no `.gitignore` to keep the resulting artifacts out of a bulk `git add` (see [Caveat 6](#6-no-gitignore-generated-artifacts-are-untracked-and-un-ignored)). `npm run lint` is safe in this respect: the `lint` script is `eslint src` with **no** `--fix` flag, so it only reports. `Source: frontend/package.json:L25`.

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

The repository does not build cleanly as-is. The six caveats below are the core reason a fresh checkout will not pass CI or produce a runnable binary or bundle without changes — the backend has no Go module (Caveat 1), the frontend has no lockfile (Caveat 2), the frontend source does not compile because of undeclared dependencies and absent modules (Caveat 3), the TypeScript config is misaligned with the CRA toolchain (Caveat 4), the Go version drifts between CI and Docker (Caveat 5), and no `.gitignore` exists to keep the artifacts these commands generate out of version control (Caveat 6). Each is cited and labeled with the project-wide maturity discipline, and a practical workaround is given where one exists. The complete Implemented/Provisioned/Designed reconciliation and the full defect catalog live in [scaffold-vs-design.md](../architecture/scaffold-vs-design.md).

### 1. No committed Go module (`go.mod` / `go.sum`)

There is no `go.mod` or `go.sum` anywhere in the repository, so the backend is not a Go module and neither `go build -v ./...` nor `go test -v ./...` — the commands the CI build and test jobs run — can succeed as-is. `Source: .github/workflows/backend-ci.yml:L19,L30`. Several packages imported by the composition root are also absent from the tree: `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware`. `Source: backend/cmd/server/main.go:L6,L8-L10,L12`. **Maturity: Designed** — the scaffold does not build. Workaround: a `go.mod` must be authored (and the absent packages supplied) before the backend can build; the full inventory is catalogued in [scaffold-vs-design.md](../architecture/scaffold-vs-design.md).
>
> **Supply-chain consequence.** Because there is no `go.sum` (and no `go.mod`), the backend has no pinned, checksum-verified dependency graph: dependency versions are not locked, builds are not reproducible across machines, and no dependency-integrity or vulnerability audit (for example `go mod verify` or `govulncheck`) can be run against the tree as-is. When you author a `go.mod` locally, pin explicit versions and commit the generated `go.sum` so transitive-dependency CVEs become auditable; treat any unpinned resolution as a supply-chain risk rather than a verified baseline. `Source: repository contains no go.mod/go.sum (backend/ tree)`.

### 2. No frontend lockfile, but CI runs `npm ci`

The frontend has no committed lockfile (`package-lock.json` is absent), yet every frontend CI job runs `npm ci`. `Source: .github/workflows/frontend-ci.yml:L18`, `Source: frontend/package.json`. Because `npm ci` installs strictly from an existing lockfile, no frontend job can complete that step against the repository as-is. In CI the step actually fails one layer earlier: no job declares a working directory, so `npm ci` executes at the repository root, where npm finds no `package.json` at all and exits `EUSAGE` before any lockfile is consulted. `Source: .github/workflows/frontend-ci.yml:L18,L29,L40` (no `working-directory` and no `defaults` key in the file), `Source: frontend/package.json` (the only Node manifest, one directory below the root). Committing a lockfile is therefore necessary but **not sufficient** for CI; the working-directory omission is catalogued as Limitation 5 in [`../contributing/development.md`](../contributing/development.md#known-limitations). **Maturity: Designed / broken CI step.** Workaround: locally, use `npm install` (which resolves dependencies and generates a `package-lock.json`) rather than `npm ci`. Note, however, that `npm install` alone is **not sufficient to build the frontend** — it only installs the packages `package.json` declares, and it neither supplies the undeclared dependencies nor creates the absent modules described in [Caveat 3](#3-frontend-source-does-not-compile); both caveats must be resolved before the app compiles.
>
> **Supply-chain consequence.** With no committed `package-lock.json`, the frontend dependency graph is not pinned: each `npm install` may resolve different transitive versions within the declared semver ranges (`Source: frontend/package.json:L9-L19`), so installs are not reproducible and `npm ci`/`npm audit` cannot verify integrity against a locked baseline. Perform installs in an isolated, disposable environment, and commit the generated `package-lock.json` (and run `npm audit`) before relying on any resolved dependency set, so transitive CVEs are surfaced rather than silently pulled in.

### 3. Frontend source does not compile

Independent of the missing lockfile (Caveat 2), the frontend **source itself does not compile** against the repository as-is, so `npm install` followed by `npm start`/`npm run build` cannot produce a working dev server or bundle. Three classes of defect are responsible:

- **Undeclared dependencies.** The source imports Redux Toolkit, `react-redux`, Zod, Axios, and Chart.js/`react-chartjs-2`, none of which are declared in `package.json`, so a clean install never obtains them. `Source: frontend/src/store/index.ts:L1`, `Source: frontend/src/services/api.ts:L1`, `Source: frontend/src/schema/transaction.ts:L1`, `Source: frontend/src/components/Chart.tsx:L2-L3`, `Source: frontend/package.json:L5-L19`.
- **Absent store slices and typed hooks.** Pages import Redux slices and typed hooks the store does not export — for example the Analytics page imports `fetchAnalyticsData` from `@/store/analyticsSlice` and the `useAppSelector`/`useAppDispatch` hooks from `@/store`, while the store registers only `vault`, `transaction`, and `user` and exports no such slice or hooks. `Source: frontend/src/pages/Analytics.tsx:L6-L7`, `Source: frontend/src/store/index.ts:L8-L12`.
- **Absent utilities/types and import/export mismatches.** Further modules import utilities, types, and named exports that are not defined in the tree, so type-checking and bundling fail. `Source: frontend/src/pages/Analytics.tsx:L2-L6`.
- **Unresolvable `@/` path alias (distinct from the absent modules above).** Every `@/`-prefixed import fails to resolve, whether or not its target exists: the alias is declared nowhere, because `frontend/tsconfig.json` sets no `baseUrl` and no `paths` mapping, and `react-scripts` does not honour a `@/` alias without ejecting or a CRA-config override — see Caveat 4. `Source: frontend/tsconfig.json:L2-L17` (no `baseUrl`/`paths` key), `Source: frontend/src/services/auth.ts` (a target that *does* exist yet still cannot be reached as `@/services/auth`). This is the first error the bundler reports, and it affects 65 import statements across 14 files, so it must be resolved before the absent-module errors above are even reachable.

**Maturity: Source-present (non-buildable).** Workaround: none is a drop-in; the undeclared dependencies must be declared and installed, the absent `store/analyticsSlice` and typed hooks (and any other absent modules) must be authored, and the import/export mismatches resolved, before the frontend compiles. `npm install` alone does not address any of these (see Caveat 2). The full inventory is catalogued in [scaffold-vs-design.md](../architecture/scaffold-vs-design.md).

### 4. TypeScript config versus the CRA toolchain

`frontend/tsconfig.json` sets `moduleResolution: "bundler"`, together with `allowImportingTsExtensions: true` and `noEmit: true` — a Vite/bundler-oriented configuration. `Source: frontend/tsconfig.json:L8-L9,L12`. The project, however, builds with Create React App (`react-scripts`), a webpack toolchain that expects `moduleResolution: "node"`. `Source: frontend/package.json:L12`. The mismatch can cause type-resolution friction under `react-scripts`. The same config also omits `baseUrl` and `paths` entirely, which is why the `@/` alias used throughout `frontend/src` resolves nowhere — TypeScript has no root to resolve it against, and CRA's webpack configuration adds no such alias of its own. `Source: frontend/tsconfig.json:L2-L17`. TypeScript is also not declared as a dependency in `frontend/package.json` even though a `tsconfig.json` is present. `Source: frontend/package.json:L5-L19`. **Maturity: Provisioned / inconsistent** — the config is present but misaligned with the actual toolchain. Workaround: in your own environment, align `moduleResolution` to `"node"` for CRA, declare `baseUrl: "src"` with a `paths` entry mapping `@/*` to `["*"]` (and mirror that alias into the bundler, since CRA does not read `paths` for module resolution without an override), and add a pinned `typescript` dependency.

### 5. Go version discrepancy (CI versus Docker)

The backend CI pins Go `1.20`, while the backend Docker image is based on `golang:1.17-alpine`. `Source: .github/workflows/backend-ci.yml:L17`, `Source: infrastructure/docker/Dockerfile.backend:L2`. The two toolchains disagree, which undermines build reproducibility between CI and the container image. **Maturity: Provisioned / inconsistent** — both artifacts exist but pin different versions.
>
> **Reproduction versus support are two different things.** To *reproduce the CI environment exactly*, install Go **1.20** specifically — the version the workflow pins (`Source: .github/workflows/backend-ci.yml:L17`); a newer local Go does **not** reproduce a build pinned to 1.20, so "Go 1.20+" is not a faithful CI reproduction. Note, however, that Go 1.20 is well past end of life: Go's release policy supports only the two most recent major releases, which were **Go 1.25 and Go 1.26 as verified on 2026-07-22**, so Go 1.20 receives no security or bug fixes. `Source: Go release policy — go.dev/doc/devel/release` (support-window policy; supported majors verified 2026-07-22). Because that window advances with each major release, re-check the policy page before relying on the specific versions named here. For a *supported* local toolchain use a release inside the current window (Go 1.25 or 1.26 as of that date); to *match CI byte-for-byte* use Go 1.20 in a throwaway environment and treat it as an unsupported, security-frozen toolchain rather than a recommended one. The CI/Docker version drift itself is a defect documented, not fixed, here.

### 6. No `.gitignore`: generated artifacts are untracked and un-ignored

The repository contains **no `.gitignore` file anywhere** — not at the root and not under `frontend/`, `backend/`, `infrastructure/terraform/`, or `docs/`. `Source: repository tree (no .gitignore present at root or in any subdirectory)`. Every artifact the commands on this page generate is therefore both untracked **and** un-ignored, and shows up as an untracked change the moment it is created:

| Command on this page | Artifact it creates | Consequence |
|----------------------|---------------------|-------------|
| `npm install` (frontend) | `frontend/node_modules/` (~875 top-level entries) and `frontend/package-lock.json` (~763 KB) | A bulk `git add -A` would stage the entire dependency tree `Source: frontend/package.json:L5-L19` |
| environment setup | `frontend/.env` — where [configuration.md](./configuration.md) notes CRA reads `REACT_APP_*` values from | Secrets and local overrides would be committed `Source: frontend/src/services/api.ts:L4` |
| `bash scripts/setup.sh` | a stray **root** `package-lock.json` (the script runs `npm install` where no `package.json` exists) | An 86-byte artifact named after the working directory; see [installation.md](./installation.md#corrected-setup-replacing-scriptssetupsh) `Source: scripts/setup.sh:L5` |
| `terraform init` | `infrastructure/terraform/.terraform/` and `.terraform.lock.hcl` (plus `terraform.tfstate` if a plan or apply is ever run) | State would hold the RDS master password; see [deployment.md](../guides/deployment.md#terraform-security-and-data-loss-gaps) `Source: infrastructure/terraform/main.tf:L99` |

**Maturity: Designed** — a `.gitignore` covering `node_modules/`, lockfile policy, `.env*`, `.terraform/`, and `*.tfstate*` is the intended hygiene control and is absent from the tree; this documentation deliverable records the gap rather than adding the file (no source, infrastructure, or repository-configuration file is modified). Workaround until it exists: stage changes explicitly (`git add <path>`) instead of `git add -A`/`git add .`, and never commit `node_modules/`, `.env`, `.terraform/`, or any `terraform.tfstate*`.

## Cross References and Next Steps

- [installation.md](./installation.md) — prerequisites and the backend/frontend install tracks.
- [configuration.md](./configuration.md) — environment variables, database DSN, Redis, and JWT settings.
- [development.md](../contributing/development.md) — contribution workflow and the fuller CI walkthrough.
- [testing.md](../contributing/testing.md) — test strategy and coverage targets.
- [scaffold-vs-design.md](../architecture/scaffold-vs-design.md) — the complete Implemented/Provisioned/Designed reconciliation and defect catalog.
- [index.md](../index.md) — documentation home and full navigation.
