# Changelog

All notable changes to the Blockchain Integration Service and Dashboard project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes are tracked yet. New entries will be recorded here under the standard Keep a Changelog categories — Added, Changed, Deprecated, Removed, Fixed, and Security — as they land.

## [0.1.0] - 2025-01-01

Initial baseline that records the repository as it exists today: an early-stage custodial blockchain integration service (vaults, signatures, and transactions) with a React dashboard, infrastructure definitions, continuous integration, and a comprehensive documentation set. This is a scaffold, not a production-ready release; see the Notes section below.

### Added

- Backend — Go/Gin service scaffold: a layered modular monolith exposing 18 REST endpoints across authentication (3), vault (5), transaction (5), and signature (5) resources, backed by PostgreSQL (`lib/pq` + `sqlx`) and Redis (`go-redis/v8`), with vault, transaction, and signature core services plus two ticker-based background processors. `Source: backend/internal/api/routes.go:L9-L54`, `Source: backend/internal/db/postgres.go`, `Source: backend/internal/db/redis.go`
- Data model: five GORM entities — Organization, User, Vault, Transaction, and Signature (`Transaction.Amount` uses `decimal.Decimal`; `Signature` carries a `RawSignature`). `Source: backend/internal/db/schema.go:L11-L68`
- Frontend — React 18 + TypeScript dashboard: a single-page application built with `react-scripts` (Create React App), Redux Toolkit state management (vault, transaction, and user slices), five feature pages, shared components, Zod validation schemas, and Axios and WebSocket service clients. `Source: frontend/package.json`, `Source: frontend/src/store/index.ts`
- Infrastructure definitions: Terraform for an AWS ECS topology (VPC, ALB, RDS PostgreSQL, ElastiCache Redis, and provisioned S3 and MSK) and Docker build files for the backend and frontend. `Source: infrastructure/terraform/main.tf`, `Source: infrastructure/docker/Dockerfile.backend`
- Continuous integration: GitHub Actions workflows for the backend (build, test, and golangci-lint on Go 1.20) and the frontend. `Source: .github/workflows/backend-ci.yml`, `Source: .github/workflows/frontend-ci.yml`
- Documentation set: a comprehensive `docs/` tree (getting-started, architecture, API reference with an OpenAPI 3.0 specification, guides, operations and observability, and security), a self-contained reveal.js executive presentation under `blitzy-deck/`, and repository governance files (`README.md`, `CONTRIBUTING.md`, `LICENSE`, and this changelog). `Source: README.md`

### Notes

- Maturity: The backend is an early-stage scaffold and is not production-ready. It ships without a `go.mod` manifest and references several packages that are not yet present in the tree (for example `internal/config`, `pkg/logger`, `internal/blockchain`, `internal/custodian`, and `internal/api/middleware`). Infrastructure is provisioned at the definition level (Terraform), while the application-level Kafka fan-out and the full observability stack (correlation IDs, tracing, `/metrics`, and health and readiness endpoints) are design-only at this stage.
- Known gaps (documented, not fixed): a composition-root and router signature mismatch (`SetupRouter` called with four arguments but defined with none), an uninitialized background-processor ticker interval that panics on startup, the `/vault` (backend) versus `/vaults` (frontend) resource-path disagreement, a dual-identifier inconsistency in the GORM models (embedded `gorm.Model` alongside a redeclared `ID uuid.UUID`), and a broken analytics store reference on the Analytics page. These are catalogued rather than resolved. `Source: docs/architecture/scaffold-vs-design.md`
