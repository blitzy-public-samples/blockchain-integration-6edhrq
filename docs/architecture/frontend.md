# Frontend Architecture

The frontend of the Blockchain Integration Service and Dashboard is a React 18 + TypeScript single-page application (SPA) whose global state is managed with Redux Toolkit and whose navigation is handled by React Router. `Source: frontend/src/app.tsx:L14-L38`, `Source: frontend/src/store/index.ts:L8-L12`. The application shell composes a Redux `Provider`, an `AuthProvider`, and a `BrowserRouter`, and it frames every routed page with a shared `Header` and `Sidebar`. `Source: frontend/src/app.tsx:L16-L34`. Server communication runs over an Axios client whose request interceptor attaches a JWT bearer token to every call, while a `WebSocketService` class opens a realtime channel that authenticates itself on connection. `Source: frontend/src/services/api.ts:L11-L17`, `Source: frontend/src/services/websocket.ts:L14-L21`. This page is the authoritative home of **Fig A3 — Frontend Component & State Architecture**, the component-and-state graph that complements the backend before/after pair — **Fig A1** and **Fig A2** — authored in [`overview.md`](overview.md).

## Maturity Legend

Every capability named on this page is tagged with the project-wide maturity discipline, consistent with the labeling used in [`overview.md`](overview.md) and [`data-model.md`](data-model.md):

- **Implemented** — present and functional in the code as-declared today.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified in the design corpus (`documentation/*.md`), not yet present in code.

Two frontend-specific qualifications apply. First, the React component tree, the routing shell, the three registered Redux slices, and the three service modules are **Implemented**, but several modules carry broken store and utility references that make specific pages non-functional at runtime; these are called out below as **Implemented defects** rather than hidden. Second, the visual styling of the UI is **Designed** only — the Technical Specification describes a "React with Tailwind CSS" frontend, but `frontend/package.json` declares no Tailwind dependency and the source tree contains zero `.css` files, so components carry `className` hooks with no accompanying stylesheet today. `Source: frontend/package.json`, `Source: documentation/Technical Specifications.md:§TECHNOLOGY STACK`.

## Fig A3 — Frontend Component & State Architecture

**Fig A3 — Frontend Component & State Architecture** maps the React application shell to its five routed pages, the eight shared components, the three registered Redux slices, and the three service modules. It deliberately renders the two broken store references — `analyticsSlice` and `signatureSlice` — as dashed nodes so that the difference between what is wired and what is merely referenced is legible at a glance. The figure is the frontend counterpart to the backend before/after pair in [`overview.md`](overview.md); it is referenced by name from the [Known Gaps and Divergences](#known-gaps-and-divergences) section below and re-expressed in the executive summary deck ([`../../blitzy-deck/executive-summary.html`](../../blitzy-deck/executive-summary.html)).

**Figure A3 — Frontend Component & State Architecture (React 18 + TypeScript, as-wired today)**

```mermaid
flowchart TD
    subgraph Legend_A3["Legend"]
        LG1["Solid box = implemented module"]
        LG2["Dashed box = referenced but ABSENT (broken import)"]
        LG3["Solid arrow = import/dispatch; Dashed arrow = broken reference"]
    end

    App["app.tsx (Provider + AuthProvider + BrowserRouter)"]
    App --> Store["store/index.ts (configureStore)"]
    App --> Dash["Dashboard"]
    App --> VaultPg["VaultManagement"]
    App --> TxPg["TransactionProcessing"]
    App --> SigPg["SignatureManagement"]
    App --> Ana["Analytics"]

    subgraph Comp["Shared Components (8)"]
        Header["Header"]
        Sidebar["Sidebar"]
        Chart["Chart"]
        VaultList["VaultList"]
        VaultDetails["VaultDetails"]
        TxForm["TransactionForm"]
        TxList["TransactionList"]
        SigReq["SignatureRequest"]
    end

    subgraph Slices["Registered Redux Slices"]
        VaultSlice["vaultSlice"]
        TxSlice["transactionSlice"]
        UserSlice["userSlice"]
    end

    AnaSlice["analyticsSlice (ABSENT)"]
    SigSlice["signatureSlice (ABSENT)"]

    subgraph Svc["Services (3)"]
        Api["api.ts (axios + JWT interceptor)"]
        Auth["auth.ts (login/logout)"]
        Ws["websocket.ts (realtime)"]
    end

    Store --> VaultSlice
    Store --> TxSlice
    Store --> UserSlice

    VaultPg --> VaultList
    VaultList --> VaultDetails
    VaultDetails --> TxList
    TxPg --> TxForm
    SigPg --> SigReq
    Dash --> Chart
    Ana --> Chart

    VaultList --> VaultSlice
    TxForm --> TxSlice
    TxList --> TxSlice
    Header --> UserSlice
    Sidebar --> UserSlice

    Ana -.->|"broken import: fetchAnalyticsData"| AnaSlice
    SigReq -.->|"broken import: requestSignature"| SigSlice

    Api --> Backend["Go/Gin Backend API"]
    Auth --> Api
    Ws --> Backend
```

As the `Legend_A3` subgraph in **Fig A3** states, solid boxes and solid arrows denote **Implemented** modules and their real import/dispatch wiring: `app.tsx` composes the store and mounts the five routed pages (**Implemented**); the store registers the `vault`, `transaction`, and `user` slices (**Implemented**); and the `Header`, `Sidebar`, `VaultList`, `VaultDetails`, `TransactionForm`, `TransactionList`, and `Chart` components read from or dispatch to those registered slices (**Implemented**). `Source: frontend/src/app.tsx:L16-L34`, `Source: frontend/src/store/index.ts:L8-L12`. The dashed boxes `analyticsSlice (ABSENT)` and `signatureSlice (ABSENT)`, together with the dashed arrows into them, mark the two broken references (**Implemented defect**): the `Analytics` page and the `SignatureRequest` component import from store slices that do not exist and that the store never registers. `Source: frontend/src/pages/Analytics.tsx:L7`, `Source: frontend/src/components/SignatureRequest.tsx:L3`, `Source: frontend/src/store/index.ts:L8-L12`. Both defects are dissected in the [Known Gaps and Divergences](#known-gaps-and-divergences) section.

## Pages and Routing

The router mounts five page components, each wrapped by the shared `Header` and `Sidebar` from the application shell. `Source: frontend/src/app.tsx:L20-L34`. The route-to-page mapping is declared directly in `app.tsx`.

| Route | Page component | Purpose | Maturity |
|-------|----------------|---------|----------|
| `/` | `Dashboard` | Landing overview that aggregates vaults, transactions, and a summary `Chart`; dispatches `fetchVaults` and `fetchTransactions` on mount. | Implemented |
| `/vault-management` | `VaultManagement` | Create, list, and inspect custodial vaults via `VaultList` and `VaultDetails`; dispatches `fetchVaults`/`createVault`. | Implemented |
| `/transaction-processing` | `TransactionProcessing` | Submit new transactions through `TransactionForm` and track them via `TransactionList`; dispatches `createTransaction`/`fetchTransactions`. | Implemented |
| `/signature-management` | `SignatureManagement` | Request and monitor signatures via `SignatureRequest`; imports `requestSignature`/`checkSignatureStatus` from the absent `signatureSlice`. | Implemented defect |
| `/analytics` | `Analytics` | Render analytics visualizations via `Chart`; imports `fetchAnalyticsData` from the absent `analyticsSlice` and reads `state.analytics.data`. | Implemented defect |

The route declarations are at `Source: frontend/src/app.tsx:L25-L29`. The per-page slice wiring is verifiable in the page sources: `Dashboard` dispatches `fetchVaults`/`fetchTransactions` `Source: frontend/src/pages/Dashboard.tsx:L9-L10`; `VaultManagement` dispatches `fetchVaults`/`createVault` `Source: frontend/src/pages/VaultManagement.tsx:L8`; `TransactionProcessing` dispatches `createTransaction`/`fetchTransactions` `Source: frontend/src/pages/TransactionProcessing.tsx:L8`; `SignatureManagement` imports from the absent `signatureSlice` `Source: frontend/src/pages/SignatureManagement.tsx:L7`; and `Analytics` imports from the absent `analyticsSlice` `Source: frontend/src/pages/Analytics.tsx:L7`.

## Shared Components

Eight reusable components live under `frontend/src/components`. Each is **Implemented** except where it references an absent store slice, which is labeled an **Implemented defect** and detailed in [Known Gaps and Divergences](#known-gaps-and-divergences).

| Component | Role | Store / utility dependencies | Maturity |
|-----------|------|------------------------------|----------|
| `Chart` | Data-visualization wrapper exposing `Line`, `Bar`, and `Pie` renderers. | chart.js, react-chartjs-2 (no store) | Implemented |
| `Header` | Top navigation bar that reflects the current user. | `selectUser` from `userSlice` | Implemented |
| `Sidebar` | Side navigation that reflects the current user. | `selectUser` from `userSlice` | Implemented |
| `VaultList` | Lists vaults and renders `VaultDetails` for each. | `selectVaults`/`fetchVaults` from `vaultSlice` | Implemented |
| `VaultDetails` | Shows a vault's detail and embeds `TransactionList`. | `utils/formatters` (`formatCurrency`, `truncateAddress`) | Implemented |
| `TransactionForm` | Form that validates input and dispatches new transactions. | `createTransaction` from `transactionSlice`; `utils/validators` | Implemented |
| `TransactionList` | Lists transactions with formatted amounts and dates. | `selectTransactions` from `transactionSlice`; `utils/formatters` | Implemented |
| `SignatureRequest` | Requests a signature and polls its status. | `requestSignature`/`checkSignatureStatus` from the absent `signatureSlice`; `utils/formatters` | Implemented defect |

Component wiring is verifiable in each source file: `Source: frontend/src/components/Chart.tsx:L2-L3`, `Source: frontend/src/components/Header.tsx:L3-L4`, `Source: frontend/src/components/Sidebar.tsx:L3-L4`, `Source: frontend/src/components/VaultList.tsx:L3-L4`, `Source: frontend/src/components/VaultDetails.tsx:L2-L3`, `Source: frontend/src/components/TransactionForm.tsx:L3-L4`, `Source: frontend/src/components/TransactionList.tsx:L3-L4`, `Source: frontend/src/components/SignatureRequest.tsx:L3-L4`.

## Services

Three service modules under `frontend/src/services` mediate all communication with the backend. The Axios client is the REST transport; `auth.ts` manages the session; and `websocket.ts` provides the realtime channel.

| Service | Responsibility | Key notes | Maturity |
|---------|----------------|-----------|----------|
| `api.ts` | Axios instance factory for backend REST calls. | Request interceptor attaches `Authorization: Bearer <token>`; response interceptor carries a 401-refresh TODO; calls plural paths `GET /vaults`, `POST /transactions`, `GET /signatures/:id`. | Implemented (with defects) |
| `auth.ts` | Session helpers `login`, `logout`, `isAuthenticated`. | `login` posts to `/auth/login`; persists the JWT via `utils/storage` (absent); imports `createApiInstance`, which `api.ts` does not export. | Implemented defect |
| `websocket.ts` | `WebSocketService` realtime channel. | On open, sends `{ type: 'authenticate', token }`; reads the token from `utils/auth` (absent). | Implemented defect |

The Axios request interceptor attaches the bearer token on every outbound call (**Implemented**). `Source: frontend/src/services/api.ts:L11-L17`:

```ts
const token = await getAuthToken();
if (token) config.headers['Authorization'] = `Bearer ${token}`;
```

The response interceptor is a pass-through with an outstanding 401-refresh TODO (**Implemented**, incomplete). `Source: frontend/src/services/api.ts:L19-L27`. The REST helpers call plural resource paths that diverge from the backend router. `Source: frontend/src/services/api.ts:L32-L46`. The session helpers post to `/auth/login` and persist the JWT. `Source: frontend/src/services/auth.ts:L4-L17`. The realtime channel authenticates on open by sending an `authenticate` message with the token. `Source: frontend/src/services/websocket.ts:L14-L21`.

## State Management (Redux Store)

The Redux store is assembled by a single `configureStore` call that registers exactly three reducers — `vault`, `transaction`, and `user` — with the Redux DevTools enhancer gated on `NODE_ENV`. `Source: frontend/src/store/index.ts:L8-L13` (**Implemented**). The module exports the `RootState` and `AppDispatch` types derived from the configured store, which the typed `useAppSelector`/`useAppDispatch` hooks consume across the component tree. `Source: frontend/src/store/index.ts:L21-L22` (**Implemented**).

| Registered reducer | Store key | Primary consumers | Maturity |
|--------------------|-----------|-------------------|----------|
| `vaultReducer` | `vault` | `VaultList`, `VaultManagement`, `Dashboard` | Implemented |
| `transactionReducer` | `transaction` | `TransactionForm`, `TransactionList`, `TransactionProcessing`, `Dashboard` | Implemented |
| `userReducer` | `user` | `Header`, `Sidebar` | Implemented |

Critically, the store registers no `analytics` reducer and no `signature` reducer, so the `state.analytics.data` read in `Analytics` and the `signatureSlice` dispatches in `SignatureRequest` and `SignatureManagement` resolve against slices that are never mounted (**Implemented defect**). `Source: frontend/src/store/index.ts:L8-L12`, `Source: frontend/src/pages/Analytics.tsx:L15`, `Source: frontend/src/components/SignatureRequest.tsx:L3`.


## Known Gaps and Divergences

The frontend scaffold is **Implemented** as a component tree and routing shell, but it carries concrete defects and cross-boundary divergences. Consistent with the documentation-only scope of this deliverable, each is **documented, not fixed**; the code is left unmodified. The consolidated Implemented / Provisioned / Designed reconciliation is maintained in [`scaffold-vs-design.md`](scaffold-vs-design.md), and the resource-path contract is authoritative in [`../api-reference/overview.md`](../api-reference/overview.md).

### Broken `analyticsSlice` reference (Implemented defect)

The `Analytics` page imports `fetchAnalyticsData` from `@/store/analyticsSlice` and reads `state.analytics.data`, but no `analyticsSlice` module exists in `frontend/src/store` and the store registers no `analytics` reducer. `Source: frontend/src/pages/Analytics.tsx:L7`, `Source: frontend/src/pages/Analytics.tsx:L15`, `Source: frontend/src/store/index.ts:L8-L12`. As a result, the `Analytics` page cannot resolve its state at runtime — the selector reads an undefined slice and the dispatched thunk has no reducer to service it. This is the dashed `analyticsSlice (ABSENT)` node and its dashed inbound arrow in **Fig A3**.

### Broken `signatureSlice` reference (related Implemented defect)

The `SignatureRequest` component imports `requestSignature` and `checkSignatureStatus` from `@/store/signatureSlice`, which is likewise absent from the store. `Source: frontend/src/components/SignatureRequest.tsx:L3`, `Source: frontend/src/store/index.ts:L8-L12`. The same absent slice is imported by the `SignatureManagement` page. `Source: frontend/src/pages/SignatureManagement.tsx:L7`. This is the dashed `signatureSlice (ABSENT)` node and its dashed inbound arrow in **Fig A3**; both the component and the page fail to resolve their signature actions at runtime.

### API path and status vocabulary divergences (note)

The Axios client calls plural resource paths — `GET /vaults`, `POST /transactions`, and `GET /signatures/:id` — whereas the backend router exposes the singular vault group `/vault/*` alongside `/transactions/*` and `/signatures/*`, so the vault calls in particular do not line up. `Source: frontend/src/services/api.ts:L32-L46`. Independently, the client-side Zod transaction schema uses the status vocabulary `Pending | Completed | Failed`, which diverges from the backend's `Pending | Processed`. `Source: frontend/src/schema/transaction.ts:L10`. These divergences are cataloged in full in [`scaffold-vs-design.md`](scaffold-vs-design.md) and the endpoint contract is detailed in [`../api-reference/overview.md`](../api-reference/overview.md) (**Designed** reconciliation pending).

### Absent utility modules (Implemented defect)

Three service modules import from utility modules that do not exist. `websocket.ts` and `api.ts` import `getAuthToken` from `utils/auth`, and `auth.ts` imports `setItem`/`getItem`/`removeItem` from `utils/storage`, but the `frontend/src/utils` directory contains only `formatters.ts` and `validators.ts`. `Source: frontend/src/services/websocket.ts:L1`, `Source: frontend/src/services/api.ts:L2`, `Source: frontend/src/services/auth.ts:L2`. Consequently, token retrieval and JWT persistence have no backing implementation today (**Implemented defect**).

### Additional verified scaffold defects (note)

Two further inconsistencies were confirmed first-hand while mapping the shell and services, and are recorded here for completeness. First, `app.tsx` imports `AuthProvider` from `@/services/auth`, but `auth.ts` exports only `login`, `logout`, and `isAuthenticated` — no `AuthProvider` symbol is defined. `Source: frontend/src/app.tsx:L12`, `Source: frontend/src/services/auth.ts:L4-L43` (**Implemented defect**). Second, `auth.ts` imports `createApiInstance` from `api.ts`, yet `api.ts` declares `createApiInstance` as a non-exported local constant and exports only `getVaults`, `createTransaction`, and `getSignatureStatus`. `Source: frontend/src/services/auth.ts:L1`, `Source: frontend/src/services/api.ts:L6`, `Source: frontend/src/services/api.ts:L32-L44` (**Implemented defect**). Finally, several runtime libraries the source imports — `@reduxjs/toolkit`, `react-redux`, `chart.js`, `react-chartjs-2`, `zod`, and `axios` — are not declared in `frontend/package.json`, which lists only `react`, `react-dom`, `react-router-dom`, `react-scripts`, and testing utilities. `Source: frontend/package.json` (**Designed** dependency reconciliation pending). These are documented here and reconciled in [`scaffold-vs-design.md`](scaffold-vs-design.md).

## Related Documentation

The frontend architecture is one page in a set of sibling architecture and reference documents:

- [`overview.md`](overview.md) — the system overview and the backend before/after pair, **Fig A1 — Current Implemented Scaffold** and **Fig A2 — Designed Target Architecture**.
- [`backend.md`](backend.md) — the Go/Gin layered modular monolith, dependency injection, and wiring-gap detail.
- [`data-flow.md`](data-flow.md) — the authentication, transaction-settlement, and signature sequences plus the end-to-end data flow that the pages and services above participate in.
- [`data-model.md`](data-model.md) — the five persisted entities and their relationships in **Fig M1 — Data Model ERD** ([`data-model.md#fig-m1--data-model-erd`](data-model.md#fig-m1--data-model-erd)), which the client-side Zod schemas mirror.
- [`scaffold-vs-design.md`](scaffold-vs-design.md) — the consolidated Implemented / Provisioned / Designed matrix that reconciles every gap named on this page.
- [`../api-reference/overview.md`](../api-reference/overview.md) — the authoritative public HTTP contract for the 18 endpoints, including the resource-path reconciliation.

Feature-level walkthroughs for the pages documented above are provided in the user guides: [`../guides/vault-management.md`](../guides/vault-management.md), [`../guides/transaction-processing.md`](../guides/transaction-processing.md), and [`../guides/signature-management.md`](../guides/signature-management.md).

