# Vault Management Guide

This guide covers the **Vault Management** feature (**VM-001**) of the Blockchain Integration Service and Dashboard: how to set up the environment for vaults, how to create and inspect vaults through the UI and REST API, and how to troubleshoot the known issues in the current scaffold. A vault is a custodial container that holds a blockchain address for an organization `Source: backend/internal/core/vault/service.go:L30-L36`.

For the raw endpoint contract, see [Vaults API Reference](../api-reference/vaults.md). For the entity definition and relationships, see [Data Model](../architecture/data-model.md) (`Fig M1 - Data Model ERD`). This guide is linked from the [documentation index](../index.md).

> Maturity legend: **Implemented** = present and working in the code today; **Provisioned** = infrastructure exists but is not wired; **Designed** = specified but absent from the code today.

## Overview

A vault ties an organization to a blockchain address for a given chain. The vault service exposes three operations: create, get-by-id, and list-by-organization `Source: backend/internal/core/vault/service.go:L24,L46,L50`. Vaults are multi-tenant: `ListVaults` filters by `organizationID`, so callers only see vaults for their own organization `Source: backend/internal/core/vault/service.go:L50-L51`.

| Capability | Detail | Maturity |
|------------|--------|----------|
| Create vault | Generates an address then persists the vault | Implemented (service); Designed (address generation) |
| Get vault by ID | Reads a single vault | Implemented |
| List vaults by organization | Multi-tenant listing | Implemented |
| Blockchain address generation | `blockchainClient.GenerateAddress` | Designed (adapter package absent) |

The create path calls `blockchainClient.GenerateAddress(blockchainType)` before persisting the vault `Source: backend/internal/core/vault/service.go:L25`. The `blockchain` adapter package is imported but not present in the repository, so address generation is **Designed** rather than runnable `Source: backend/internal/core/vault/service.go:L6`.

## Setup

**Prerequisites (Implemented in scaffold).** The vault service is constructed with a database repository and a blockchain client via `NewVaultService(repo, blockchainClient)` `Source: backend/internal/core/vault/service.go:L15`. Persistence targets PostgreSQL through the shared repository. Configure the backend database and cache connections as described in [Configuration](../getting-started/configuration.md) before exercising vault operations.

**Backend route group (Implemented).** Vault routes are registered under the singular `/vault` group and are protected by authentication middleware `Source: backend/internal/api/routes.go:L25-L31`:

```text
POST   /vault/create
GET    /vault/list
GET    /vault/:id
```

There is no `/api/v1` prefix in the router `Source: backend/internal/api/routes.go:L9-L54`. See [Vaults API Reference](../api-reference/vaults.md) for full request and response schemas.

**Frontend page (Implemented, with a defect).** The Vault Management page reads vaults from Redux state at `state.vault.vaults` and dispatches `fetchVaults` on mount `Source: frontend/src/pages/VaultManagement.tsx:L27,L34`. It renders the `Header`, `Sidebar`, `VaultList`, and `VaultDetails` components `Source: frontend/src/pages/VaultManagement.tsx:L2-L5`.

## Usage

**Create a vault (UI).** Submitting the vault-creation form dispatches `createVault` and unwraps the result `Source: frontend/src/pages/VaultManagement.tsx:L44`. The backend `CreateVault` receives an `organizationID`, `name`, and `blockchainType`, generates an address, and stores the vault with a new UUID `Source: backend/internal/core/vault/service.go:L24-L43`.

**List vaults (UI).** On mount, the page loads vaults for the current organization; the list is bound to `state.vault.vaults` `Source: frontend/src/pages/VaultManagement.tsx:L31-L38`.

**Create a vault (API).** Send an authenticated `POST /vault/create` request. The five vault endpoints and their bodies are documented in the [Vaults API Reference](../api-reference/vaults.md); the vault entity fields (`ID`, `OrganizationID`, `Name`, `BlockchainType`, `Address`) are catalogued in the [Data Model](../architecture/data-model.md).

### Resource-path discrepancy (must-read)

The frontend, the backend, and the design specification disagree on the vault resource path:

| Layer | Path | Source |
|-------|------|--------|
| Frontend API client | `GET /vaults` (plural) | `Source: frontend/src/services/api.ts:L34` |
| Backend router | `GET /vault/list` (singular) | `Source: backend/internal/api/routes.go:L28` |
| Technical Specification | `/api/v1/vaults` | `Source: documentation/Technical Specifications.md:§API DESIGN` |

**Maturity: Designed reconciliation.** Until the paths are reconciled, frontend vault calls will not reach the backend routes. This is a documented divergence; no source code is changed by this documentation. The reconciliation is tracked in [Scaffold vs Design](../architecture/scaffold-vs-design.md).

## Troubleshooting

**Creating a vault throws `setVaults is not defined`.** The page's `handleCreateVault` calls `setVaults(...)` after dispatching `createVault`, but no `setVaults` state setter is declared in the component (only the `vaults` selector exists) `Source: frontend/src/pages/VaultManagement.tsx:L44-L47`. This is a known scaffold defect (**Implemented defect**); the create dispatch itself succeeds, but the trailing local-state update references an undefined symbol. Documented, not fixed.

**Vault list is empty even after creating a vault.** Because of the resource-path discrepancy above, the plural `/vaults` client call `Source: frontend/src/services/api.ts:L34` does not match the singular `/vault/list` route `Source: backend/internal/api/routes.go:L28`. Verify which path the environment actually serves before assuming a data problem.

**Address generation fails or the backend does not build.** `GenerateAddress` is provided by the `blockchain` adapter package, which is imported but absent `Source: backend/internal/core/vault/service.go:L6`. Vault creation cannot complete end-to-end until that package exists (**Designed**). See the wiring gaps in [Backend Architecture](../architecture/backend.md).

**Confidence caveat in the code.** `CreateVault` carries a "HUMAN ASSISTANCE NEEDED" review marker in the scaffold `Source: backend/internal/core/vault/service.go:L22-L23`; treat its production readiness as **Designed**.

## Related documentation

- [Vaults API Reference](../api-reference/vaults.md) - endpoint contract for the five vault routes.
- [Data Model](../architecture/data-model.md) - `Fig M1 - Data Model ERD` and the Vault entity fields.
- [Data Flow](../architecture/data-flow.md) - request sequences across the vault service.
- [Scaffold vs Design](../architecture/scaffold-vs-design.md) - maturity matrix and the path reconciliation.
- [Documentation index](../index.md).
