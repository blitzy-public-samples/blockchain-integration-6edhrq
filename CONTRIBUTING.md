# Contributing to the Blockchain Integration Service and Dashboard

Thank you for your interest in contributing to the Blockchain Integration Service
and Dashboard. This file is the repository's top-level contribution entry point.
It summarizes how to get set up, the standards your change is expected to meet, and
how work is validated in continuous integration (CI). Deeper, step-by-step
contributor detail lives in the `docs/` tree and is linked from each section
below rather than duplicated here — see
[`docs/contributing/development.md`](docs/contributing/development.md) for the
full contribution-workflow and CI walkthrough and
[`docs/contributing/testing.md`](docs/contributing/testing.md) for the test
strategy.

The system is a two-tier application: a Go (Gin) backend and a React 18 +
TypeScript frontend built with Create React App (CRA). Contributions to either
tier are welcome.

## Code of Conduct

We want this project to be a welcoming, respectful, and harassment-free space for
everyone. By participating you agree to engage constructively, assume good intent,
give and accept feedback graciously, and keep discussion focused on the technical
merits of a change. Report unacceptable behavior to the project maintainers.

## Getting the Code and Branching

Development targets the `main` branch. Both CI workflows run automatically on every
push and pull request that targets `main`, so the intended model is to fork or
create a topic branch from `main`, commit your work there, and open a pull request
back against `main` so CI can validate it.
`Source: .github/workflows/backend-ci.yml:L3-L7`,
`Source: .github/workflows/frontend-ci.yml:L3-L7`.

## Development Environment

Set up both stacks locally before contributing. Prerequisites and the per-stack
install steps are documented in
[`docs/getting-started/installation.md`](docs/getting-started/installation.md),
and the day-to-day build, run, and test loop is documented in
[`docs/getting-started/local-development.md`](docs/getting-started/local-development.md).
This file does not duplicate those steps.

- **Backend** — Go with the Gin web framework; source under `backend/`.
- **Frontend** — React 18 + TypeScript, scaffolded with Create React App; source
  under `frontend/`.

## Coding Standards

### Go (backend)

Backend Go code is expected to pass `golangci-lint`, which CI installs at version
`v1.50.1` and then runs. `Source: .github/workflows/backend-ci.yml:L41-L43`. Run
the same check locally from the `backend/` directory:

```bash
golangci-lint run
```

### Frontend (React / TypeScript)

Frontend code is expected to pass ESLint and be formatted with Prettier, both wired
through the package manifest scripts: the `lint` script runs `eslint src` and the
`format` script runs `prettier --write src`. `Source: frontend/package.json:L25-L26`.
The `lint` script is the one the frontend CI lint job invokes.
`Source: .github/workflows/frontend-ci.yml:L40-L41`. Run both locally from the
`frontend/` directory:

```bash
npm run lint
npm run format
```

The full coding-standards walkthrough, including linter configuration notes, is in
[`docs/contributing/development.md`](docs/contributing/development.md).

## Testing

Run each stack's tests before opening a pull request. These commands mirror the two
CI test jobs:

- **Backend** — from the `backend/` directory, run `go test -v ./...`.
  `Source: .github/workflows/backend-ci.yml:L30`.
- **Frontend** — from the `frontend/` directory, run `npm test` (CI runs `npm ci`
  first). `Source: .github/workflows/frontend-ci.yml:L29-L30`.

The full test strategy, framework inventory, and coverage targets are documented in
[`docs/contributing/testing.md`](docs/contributing/testing.md).

## Continuous Integration

Two GitHub Actions workflows implement CI, one per application tier. Both trigger on
every push and pull request to `main`.
`Source: .github/workflows/backend-ci.yml:L3-L7`,
`Source: .github/workflows/frontend-ci.yml:L3-L7`. Each workflow defines three
independent jobs — `build`, `test`, and `lint`.

**Backend CI** — Go `1.20`. `Source: .github/workflows/backend-ci.yml:L17`.

| Job | Command | Source |
|-----|---------|--------|
| `build` | `go build -v ./...` | `.github/workflows/backend-ci.yml:L19` |
| `test` | `go test -v ./...` | `.github/workflows/backend-ci.yml:L30` |
| `lint` | install `golangci-lint` `v1.50.1`, then `golangci-lint run` | `.github/workflows/backend-ci.yml:L41-L43` |

**Frontend CI** — Node `14.x`. `Source: .github/workflows/frontend-ci.yml:L17`.

| Job | Command | Source |
|-----|---------|--------|
| `build` | `npm ci` then `npm run build` | `.github/workflows/frontend-ci.yml:L18-L19` |
| `test` | `npm ci` then `npm test` | `.github/workflows/frontend-ci.yml:L29-L30` |
| `lint` | `npm ci` then `npm run lint` | `.github/workflows/frontend-ci.yml:L40-L41` |

**Maturity: Provisioned** — the workflow files are committed and structurally
valid, but the pipelines do not pass against the repository as-is (see
[Project Maturity and Known Limitations](#project-maturity-and-known-limitations)).
The job-by-job walkthrough is in
[`docs/contributing/development.md`](docs/contributing/development.md).

## Submitting Changes

- Open a pull request against the `main` branch so both CI workflows run against it.
  `Source: .github/workflows/backend-ci.yml:L3-L7`,
  `Source: .github/workflows/frontend-ci.yml:L3-L7`.
- Ensure the CI jobs for the stack you touched are green: `build`, `test`, and
  `lint` for the backend and/or the frontend.
- Keep changes minimal and focused — one logical change per pull request — and
  include a clear description of what changed and why.
- Update the relevant `docs/` pages when your change alters behavior, configuration,
  or the public API.

## Project Maturity and Known Limitations

In the interest of honesty, note that this repository is an early-stage scaffold.
Neither CI pipeline can pass against it as-is, so local builds may require
additional setup beyond the commands above:

- **Backend** — there is no committed `go.mod`/`go.sum` in the repository, so
  `go build -v ./...` and `go test -v ./...` have no module context and cannot
  resolve imports or compile as-is. **Maturity: Designed** (build module absent).
  `Source: .github/workflows/backend-ci.yml:L19,L30`.
- **Frontend** — every frontend CI job begins with `npm ci`, which installs
  strictly from a committed lockfile, but no `package-lock.json` is committed; a
  local `npm install` must be run first to generate one. **Maturity: Provisioned**
  (dependencies declared, lockfile absent).
  `Source: .github/workflows/frontend-ci.yml:L18,L29,L40`.

The authoritative Implemented / Provisioned / Designed matrix and the full defect
catalog are maintained in
[`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md);
the CI-specific limitations are enumerated in
[`docs/contributing/development.md`](docs/contributing/development.md).

## Related Documentation

- [`docs/contributing/development.md`](docs/contributing/development.md) —
  contribution workflow and full CI walkthrough.
- [`docs/contributing/testing.md`](docs/contributing/testing.md) — test strategy,
  framework inventory, and coverage targets.
- [`docs/getting-started/installation.md`](docs/getting-started/installation.md) —
  prerequisites and per-stack install steps.
- [`docs/getting-started/local-development.md`](docs/getting-started/local-development.md) —
  the day-to-day development loop and build caveats.
- [`docs/architecture/scaffold-vs-design.md`](docs/architecture/scaffold-vs-design.md) —
  authoritative Implemented / Provisioned / Designed matrix and defect catalog.
