# Vault Management Guide

This guide covers the **Vault Management** feature (**VM-001**) of the Blockchain Integration Service and Dashboard: how to set up the environment for vaults, how to create and inspect vaults through the UI and REST API, and how to troubleshoot the known issues in the current scaffold. A vault is a custodial container that holds a blockchain address for an organization `Source: backend/internal/core/vault/service.go:L30-L36`.

For the raw endpoint contract, see [Vaults API Reference](../api-reference/vaults.md). For the entity definition and relationships, see [Data Model](../architecture/data-model.md) (`Fig M1 - Data Model ERD`). This guide is linked from the [documentation index](../index.md).

> Maturity legend (identical to [Scaffold vs Design](../architecture/scaffold-vs-design.md)): **Implemented** = present in the repository AND compiles AND runs today; this label is reserved and nothing in this repository qualifies at this checkpoint. **Source-present (non-buildable)** = the code exists in the repository but does not compile today, so no runtime behavior may be asserted. **Provisioned** = configuration/scaffold exists and would validly apply but is not wired. **Designed** = specified in the corpus but absent from the code today.

## Overview

A vault ties an organization to a blockchain address for a given chain. The vault service is coded with three operations: create, get-by-id, and list-by-organization `Source: backend/internal/core/vault/service.go:L24,L46,L50`. **Tenant isolation is Designed, not enforced (F9-TENANCY-001).** `ListVaults` passes an `organizationID` to `repo.GetVaultsByOrganizationID` in source `Source: backend/internal/core/vault/service.go:L50-L51`, but no runnable boundary scopes callers to their own organization: the `db.Repository` type does not exist, no authentication middleware injects the caller's organization, and the package does not compile (see Build blockers below). The "callers see only their own organization" behavior is therefore a Designed target, tracked in [Scaffold vs Design](../architecture/scaffold-vs-design.md).

### VM-001 capability and status matrix

The SRS defines six VM-001 subrequirements `Source: documentation/Software Requirements Specifications (SRS).md:Section 1 (VM-001)`. The honest status of each against the current scaffold:

| VM-001 subrequirement | SRS intent | Delivery surface (source) | Status |
|-----------------------|-----------|---------------------------|--------|
| VM-001-1 List Vaults | List vaults for the organization ID | `ListVaults` -> `repo.GetVaultsByOrganizationID`; `VaultManagement` page | Source-present (non-buildable); `db.Repository` and typed hooks absent |
| VM-001-2 View Vault Details | Show details for a selected vault | `GetVault`; `VaultDetails` component | Source-present (non-buildable) |
| VM-001-3 Create Vault | Create a vault with given parameters | `CreateVault`; create form | Source-present (non-buildable); handler/service signature mismatch, address generation absent |
| VM-001-4 Manage Permissions | View and modify per-vault permissions | none | Designed (not present in code) |
| VM-001-5 Search Vaults | Search for specific vaults | none | Designed (not present in code) |
| VM-001-6 Vault Analytics | Basic vault usage/transaction analytics | none | Designed (not present in code) |

Only VM-001-1 through VM-001-3 have any source; VM-001-4 (permissions), VM-001-5 (search), and VM-001-6 (analytics) are entirely Designed. None of the six runs today, because the backend and SPA do not compile.

The create path is coded to call `blockchainClient.GenerateAddress(blockchainType)` before persisting the vault `Source: backend/internal/core/vault/service.go:L25`. The `blockchain` adapter package is imported but not present in the repository, so address generation is **Designed** rather than runnable `Source: backend/internal/core/vault/service.go:L6`.

### Build blockers (read first)

Vault management does not run today. Resolve these in roughly this order before any runtime behavior below applies (all documented, none fixed by this deliverable):

1. **No `go.mod`.** The backend is not a Go module, so nothing compiles.
2. **`db.Repository` type is absent.** `VaultService.repo` is typed `*db.Repository` and every persistence call (`repo.CreateVault`, `repo.GetVaultByID`, `repo.GetVaultsByOrganizationID`) targets it, but the `db` package defines no `Repository` type `Source: backend/internal/core/vault/service.go:L11,L38,L47,L51`.
3. **`blockchain` adapter package is absent.** `GenerateAddress` cannot resolve `Source: backend/internal/core/vault/service.go:L6,L25`.
4. **`pkg/utils` is absent.** The handler calls `utils.GetOrganizationIDFromContext(c)` from a package that does not exist `Source: backend/internal/api/handlers/vault.go:L6,L20,L44`.
5. **Handler/service signature mismatch.** `VaultHandler.CreateVault` calls `vaultService.CreateVault(orgID, createVaultRequest)` (two arguments, using an undefined `vault.CreateVaultRequest` type) while the service defines `CreateVault(organizationID, name, blockchainType)` (three scalar arguments) `Source: backend/internal/api/handlers/vault.go:L38,L50`, `Source: backend/internal/core/vault/service.go:L24`. The handler also calls `vaultService.GetAllVaults(orgID)`, but the service has no `GetAllVaults` method (it defines `ListVaults`) `Source: backend/internal/api/handlers/vault.go:L26`.
6. **Router references undefined handler methods.** The router wires `VaultHandler.ListVaults`, `.GetVault`, `.UpdateVault`, and `.DeleteVault`, none of which are defined on the handler (only `GetAllVaults` and `CreateVault` exist) `Source: backend/internal/api/routes.go:L28-L31`, `Source: backend/internal/api/handlers/vault.go:L19,L37`.
7. **Frontend typed hooks and `setVaults` are absent.** `VaultManagement` imports `useAppSelector`/`useAppDispatch` from `@/store`, which exports neither hook, and calls an undefined `setVaults` setter `Source: frontend/src/pages/VaultManagement.tsx:L7,L47`, `Source: frontend/src/store/index.ts:L19-L22`.

## Setup

**Prerequisites (source-present, non-buildable).** The vault service is coded to take a database repository and a blockchain client via `NewVaultService(repo, blockchainClient)` `Source: backend/internal/core/vault/service.go:L15`. Persistence is intended to target PostgreSQL through a repository, but the `db.Repository` type does not exist (blocker 2 above), so this prerequisite cannot be satisfied today. Configure the backend database and cache connections as described in [Configuration](../getting-started/configuration.md) as the designed setup; the operations below cannot be exercised until the build blockers are resolved.

**Backend route group (source-present).** Vault routes are declared under the singular `/vault` group with authentication middleware attached in source `Source: backend/internal/api/routes.go:L25-L31`; note the group wires several undefined handler methods (blocker 6), so the `api` package does not compile and no route is served today:

```text
POST   /vault/create
GET    /vault/list
GET    /vault/:id
```

There is no `/api/v1` prefix in the router `Source: backend/internal/api/routes.go:L9-L54`. See [Vaults API Reference](../api-reference/vaults.md) for full request and response schemas.

**Frontend page (source-present, non-buildable).** The Vault Management page is coded to read vaults from Redux state at `state.vault.vaults` and dispatch `fetchVaults` on mount `Source: frontend/src/pages/VaultManagement.tsx:L27,L34`, and to render the `Header`, `Sidebar`, `VaultList`, and `VaultDetails` components `Source: frontend/src/pages/VaultManagement.tsx:L2-L5`. It does not build: the typed hooks it imports are not exported by the store and it calls an undefined `setVaults` setter (blocker 7), so nothing renders today.

## Usage

**Create a vault (UI) - as designed.** The vault-creation form is coded to dispatch `createVault` and unwrap the result `Source: frontend/src/pages/VaultManagement.tsx:L44`. The backend `CreateVault` is coded to take an `organizationID`, `name`, and `blockchainType`, generate an address, and store the vault with a new UUID `Source: backend/internal/core/vault/service.go:L24-L43`. This flow cannot run today: the UI does not build (blocker 7), the handler passes arguments the service does not accept (blocker 5), and address generation and persistence depend on absent packages (blockers 2-3).

**List vaults (UI).** On mount, the page loads vaults for the current organization; the list is bound to `state.vault.vaults` `Source: frontend/src/pages/VaultManagement.tsx:L31-L38`.

**Create a vault (API) - as designed.** The designed request is an authenticated `POST /vault/create`. The five vault endpoints and their bodies are documented in the [Vaults API Reference](../api-reference/vaults.md); the vault entity fields (`ID`, `OrganizationID`, `Name`, `BlockchainType`, `Address`) are catalogued in the [Data Model](../architecture/data-model.md). No service answers this route today because the `api` package does not compile (blockers 4-6).

### Resource-path discrepancy (must-read)

The frontend, the backend, and the design specification disagree on the vault resource path:

| Layer | Path | Source |
|-------|------|--------|
| Frontend API client | `GET /vaults` (plural) | `Source: frontend/src/services/api.ts:L34` |
| Backend router | `GET /vault/list` (singular) | `Source: backend/internal/api/routes.go:L28` |
| Technical Specification | `/api/v1/vaults` | `Source: documentation/Technical Specifications.md:API DESIGN` |

**Maturity: Designed reconciliation.** Until the paths are reconciled, frontend vault calls will not reach the backend routes. This is a documented divergence; no source code is changed by this documentation. The reconciliation is tracked in [Scaffold vs Design](../architecture/scaffold-vs-design.md).

## Troubleshooting

**Creating a vault fails with `setVaults is not defined`.** The page's `handleCreateVault` calls `setVaults(...)` after dispatching `createVault`, but no `setVaults` state setter is declared in the component - `vaults` is read from a Redux selector, and the only local state setters are `setSelectedVault` and `setIsLoading` `Source: frontend/src/pages/VaultManagement.tsx:L28-L29,L44-L47`. This is a known scaffold defect (**source-present defect, non-buildable**): the reference to the undefined `setVaults` symbol prevents the component from building, so the create flow cannot run and no runtime success is implied. Documented, not fixed.

**Vault list is empty even after creating a vault.** Because of the resource-path discrepancy above, the plural `/vaults` client call `Source: frontend/src/services/api.ts:L34` does not match the singular `/vault/list` route `Source: backend/internal/api/routes.go:L28`. Once a service is buildable and running, verify which path it serves before assuming a data problem; today no service runs, so this is a Designed reconciliation rather than a live data issue.

**Address generation fails or the backend does not build.** `GenerateAddress` is provided by the `blockchain` adapter package, which is imported but absent `Source: backend/internal/core/vault/service.go:L6`. Vault creation cannot complete end-to-end until that package exists (**Designed**). See the wiring gaps in [Backend Architecture](../architecture/backend.md).

**Confidence caveat in the code.** `CreateVault` carries a "HUMAN ASSISTANCE NEEDED" review marker in the scaffold `Source: backend/internal/core/vault/service.go:L22-L23`; treat its production readiness as **Designed**.

## Related documentation

- [Vaults API Reference](../api-reference/vaults.md) - endpoint contract for the five vault routes.
- [Data Model](../architecture/data-model.md) - `Fig M1 - Data Model ERD` and the Vault entity fields.
- [Data Flow](../architecture/data-flow.md) - request sequences across the vault service.
- [Scaffold vs Design](../architecture/scaffold-vs-design.md) - maturity matrix and the path reconciliation.
- [Documentation index](../index.md).
