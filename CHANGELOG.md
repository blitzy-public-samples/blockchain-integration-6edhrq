# Changelog

All notable changes to the Blockchain Integration Service and Dashboard project are documented in this file.

The entry format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project *intends* to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it begins tagging releases, but **no release has been tagged in the repository** — there are no version tags in the Git history — so no version number or release date is asserted below.

## [Unreleased]

No versioned release is tracked yet. New entries will be recorded here under the standard Keep a Changelog categories — Added, Changed, Deprecated, Removed, Fixed, and Security — as they land, and a version number and date will be assigned only when a release is actually tagged.

## Baseline Snapshot — Unreleased (no tagged version)

This section records the repository as it exists today rather than a published release. Because no version is tagged, it carries no version number and no date. It captures an early-stage custodial blockchain integration service (vaults, signatures, and transactions) with a React dashboard, infrastructure definitions, continuous integration, and a comprehensive documentation set. This is a scaffold, not a production-ready release; see the Notes section below.

### Added

- Backend — Go/Gin service scaffold: a layered modular monolith exposing 18 REST endpoints across authentication (3), vault (5), transaction (5), and signature (5) resources, backed by PostgreSQL (`lib/pq` + `sqlx`) and Redis (`go-redis/v8`), with vault, transaction, and signature core services plus two ticker-based background processors. `Source: backend/internal/api/routes.go:L9-L54`, `Source: backend/internal/db/postgres.go`, `Source: backend/internal/db/redis.go`
- Data model: five GORM entities — Organization, User, Vault, Transaction, and Signature (`Transaction.Amount` uses `decimal.Decimal`; `Signature` carries a `RawSignature`). `Source: backend/internal/db/schema.go:L11-L68`
- Frontend — React 18 + TypeScript dashboard: a single-page application built with `react-scripts` (Create React App), Redux Toolkit state management (vault, transaction, and user slices), five feature pages, shared components, Zod validation schemas, and Axios and WebSocket service clients. `Source: frontend/package.json`, `Source: frontend/src/store/index.ts`
- Infrastructure definitions: Terraform for an AWS ECS topology (VPC, ALB, RDS PostgreSQL, ElastiCache Redis, and declared S3 and MSK) and Docker build files for the backend and frontend. The Terraform is **Declared-but-invalid / Designed** — it does not validate or apply as-is (for example it references an undeclared `var.postgres_password`), so it provisions no resources today. `Source: infrastructure/terraform/main.tf`, `Source: infrastructure/docker/Dockerfile.backend`
- Continuous integration: GitHub Actions workflows for the backend (build, test, and golangci-lint on Go 1.20) and the frontend. `Source: .github/workflows/backend-ci.yml`, `Source: .github/workflows/frontend-ci.yml`
- Documentation set: an extensive `docs/` tree (getting-started, architecture, API reference with an OpenAPI 3.0 specification, guides, operations and observability — including the system-administration entry point and the FM-1 … FM-5 runbook — security, contributing, and the role-based onboarding and training paths on the documentation home), a self-contained reveal.js executive presentation under `blitzy-deck/`, and the governance files. The navigation landing page (`docs/index.md`), the root contribution guide (`CONTRIBUTING.md`), the corrected `README.md` (now describing the actual Go/Gin/PostgreSQL/Redis stack), the `LICENSE`, and this changelog are all **delivered**. `Source: docs/index.md`, `Source: CONTRIBUTING.md`, `Source: README.md`, `Source: blitzy-deck/executive-summary.html`, `Source: LICENSE`

### Notes

- Maturity: The backend is an early-stage scaffold and is not production-ready. It ships without a `go.mod` manifest and references several packages that are not yet present in the tree (for example `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware`). Infrastructure is declared at the definition level (Terraform) but does not validate or apply — **Declared-but-invalid / Designed**, not provisioned — while the application-level Kafka fan-out and the full observability stack (correlation IDs, tracing, `/metrics`, and health and readiness endpoints) are design-only at this stage.
- Known gaps (documented, not fixed): a composition-root and router signature mismatch (`SetupRouter` called with four arguments but defined with none), an uninitialized background-processor ticker interval that panics on startup, the `/vault` (backend) versus `/vaults` (frontend) resource-path disagreement, a dual-identifier inconsistency in the GORM models (embedded `gorm.Model` alongside a redeclared `ID uuid.UUID`), and a broken analytics store reference on the Analytics page. These are catalogued rather than resolved. `Source: docs/architecture/scaffold-vs-design.md`
- Final-integration state (delivered): the `docs/index.md` navigation landing page, the root `CONTRIBUTING.md`, and the corrected `README.md` are all present in the tree. The `README.md` now describes the actual Go/Gin/PostgreSQL/Redis stack (the earlier Node.js/Express/MongoDB description has been removed), and the navigation and contribution deliverables are integrated. `Source: README.md`, `Source: docs/index.md`, `Source: CONTRIBUTING.md`
