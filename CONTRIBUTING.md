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

The repository does **not** ship a formal, adopted Code of Conduct: there is no
`CODE_OF_CONDUCT.md` policy file in the tree, so no reporting or enforcement
process is defined here. The following is a **non-binding** suggestion, not an
adopted policy: please engage constructively, assume good intent, give and accept
feedback graciously, and keep discussion focused on the technical merits of a
change. A binding Code of Conduct would need to be adopted and committed as a
separate governance artifact.

## Getting the Code and Branching

The repository declares **no mandatory branching model**; no branch-protection or
contribution policy file exists in the tree. The only branch-related evidence is
that both CI workflows are configured to trigger on pushes and pull requests
targeting the `main` branch.
`Source: .github/workflows/backend-ci.yml:L3-L7`,
`Source: .github/workflows/frontend-ci.yml:L3-L7`. Given that, a reasonable
**suggested** (non-binding) workflow is to create a topic branch from `main`,
commit your work there, and open a pull request back against `main` so CI runs —
but nothing in the repository requires this model.

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

Two GitHub Actions workflows implement CI, one per application tier. Both trigger
on every push and pull request to `main`, and each defines three independent jobs
— `build`, `test`, and `lint` — with the backend pinned to Go `1.20` and the
frontend to Node `14.x`.
`Source: .github/workflows/backend-ci.yml:L3-L7,L17`,
`Source: .github/workflows/frontend-ci.yml:L3-L7,L17`.

As a concise entry point, this file does not reproduce the per-job command tables;
the authoritative, job-by-job CI walkthrough — including exact commands, the
`golangci-lint v1.50.1` pin, and the end-of-life-runtime caveats — lives in
[`docs/contributing/development.md`](docs/contributing/development.md).

**Maturity: Provisioned** — the workflow files are committed and structurally
valid, but the pipelines do not pass against the repository as-is (see
[Project Maturity and Known Limitations](#project-maturity-and-known-limitations)).

## Submitting Changes

These are **suggestions**, not a repository-enforced policy (see
[Getting the Code and Branching](#getting-the-code-and-branching)):

- Opening a pull request against the `main` branch causes both CI workflows to run
  against it, because that is what their triggers are configured to do.
  `Source: .github/workflows/backend-ci.yml:L3-L7`,
  `Source: .github/workflows/frontend-ci.yml:L3-L7`.
- Ideally the CI jobs for the stack you touched (`build`, `test`, and `lint`)
  would pass. Note, however, that **neither pipeline can pass against the
  repository as-is** — the tree is an early-stage scaffold (see
  [Project Maturity and Known Limitations](#project-maturity-and-known-limitations)) —
  so a fully-green run is not achievable today and is not treated as a gate here.
- Keep changes minimal and focused — one logical change per pull request — and
  include a clear description of what changed and why.
- Update the relevant `docs/` pages when your change alters behavior, configuration,
  or the public API.

## Project Maturity and Known Limitations

In the interest of honesty, note that this repository is an early-stage scaffold.
Neither CI pipeline can pass against it as-is, so local builds may require
additional setup beyond the commands above:

- **Backend** — no `go.mod`/`go.sum` is committed anywhere in the repository
  (`Source: repository root (no go.mod/go.sum present)`), so the CI build and test
  commands `go build -v ./...` and `go test -v ./...`
  (`Source: .github/workflows/backend-ci.yml:L19,L30`) have no module context and
  cannot resolve imports or compile as-is. **Maturity: Designed** (build module
  absent).
- **Frontend** — every frontend CI job begins with `npm ci`
  (`Source: .github/workflows/frontend-ci.yml:L18,L29,L40`), which installs
  strictly from a committed lockfile; but no `package-lock.json` is committed
  (`Source: frontend/ (no package-lock.json present)`), so a local `npm install`
  must be run first to generate one. **Maturity: Provisioned** (dependencies
  declared, lockfile absent).

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
