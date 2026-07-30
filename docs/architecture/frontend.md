# Frontend Architecture

The frontend of the Blockchain Integration Service and Dashboard is a React 18 + TypeScript single-page application (SPA) whose global state is managed with Redux Toolkit and whose navigation is handled by React Router. `Source: frontend/src/app.tsx:L14-L38`, `Source: frontend/src/store/index.ts:L8-L12`. The application shell composes a Redux `Provider`, an `AuthProvider`, and a `BrowserRouter`, and it frames every routed page with a shared `Header` and `Sidebar`. `Source: frontend/src/app.tsx:L16-L34`. Server communication runs over an Axios client whose request interceptor attaches a JWT bearer token to every call, while a `WebSocketService` class opens a realtime channel that authenticates itself on connection. `Source: frontend/src/services/api.ts:L11-L17`, `Source: frontend/src/services/websocket.ts:L14-L21`. This page is the authoritative home of **Fig A3 — Frontend Component & State Architecture**, the component-and-state graph that complements the backend before/after pair — **Fig A1** and **Fig A2** — authored in [`overview.md`](overview.md).

## Maturity Legend

Every capability named on this page is tagged with the project-wide maturity discipline, consistent with the labeling used in [`overview.md`](overview.md) and [`data-model.md`](data-model.md):

- **Implemented** — present in code, building, and functional today. Reserved for genuinely working capability; at this checkpoint **nothing qualifies for it**, because the single-page application does not build.
- **Implemented-with-defects (source-present, non-buildable)** — the code is present and substantially written, but a compile-blocking defect prevents the SPA from building, so no runtime behavior can be claimed. This is the operational-truth label applied to every source-present frontend module shown as solid in **Fig A3**, consistent with [`scaffold-vs-design.md`](scaffold-vs-design.md).
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified in the design corpus (`documentation/*.md`), not yet present in code.

Two frontend-specific qualifications apply. First, the React component tree, the routing shell, the three registered Redux slices, and the three service modules are **source-present but non-buildable** (**Implemented-with-defects (source-present, non-buildable)**): the SPA does not compile today because it uses undeclared dependencies (`axios`, `zod`, `@reduxjs/toolkit`, `react-redux`), an `@/` path alias unsupported by `react-scripts`, absent store slices and absent store hooks, and named/default export mismatches — so no page renders at runtime. Specific broken store and utility references are called out below as **source-present defects** rather than hidden. Second, the visual styling of the UI is **Designed** only — the design corpus describes the frontend as "React with Tailwind CSS" `Source: documentation/Software Requirements Specifications (SRS).md:L339`, but `frontend/package.json` declares no Tailwind dependency and the source tree contains zero `.css` files, so components carry `className` hooks with no accompanying stylesheet today. The Technical Specification records the same conclusion, labeling Tailwind a design-time proposal that is not a declared or installed dependency. `Source: frontend/package.json`, `Source: documentation/Technical Specifications.md:§TECHNOLOGY STACK`.

## Fig A3 — Frontend Component & State Architecture

**Fig A3 — Frontend Component & State Architecture** maps the React application shell to its five routed pages, the eight shared components, the three registered Redux slices, and the three service modules. It deliberately renders the two broken store references — `analyticsSlice` and `signatureSlice` — as dashed nodes so that the difference between what is wired and what is merely referenced is legible at a glance. The figure is the frontend counterpart to the backend before/after pair in [`overview.md`](overview.md), and it is referenced by name from the [Known Gaps and Divergences](#known-gaps-and-divergences) section below. Fig A3 is authored here only: the executive summary deck ([`../../blitzy-deck/executive-summary.html`](../../blitzy-deck/executive-summary.html)) re-expresses the backend and operations figures (**Fig A1**, **Fig A2**, **Fig O1**, and **Fig O2**) rather than this frontend graph, so this page is the single home for the component-and-state view.

**Figure A3 — Frontend Component & State Architecture (React 18 + TypeScript, as-wired today)**

```mermaid
flowchart TD
    %% Cluster-caption budget: Mermaid wraps a subgraph caption on its own internal
    %% ~200px band (the inner div carries max-width:200px) which flowchart.wrappingWidth
    %% does NOT widen, and it reserves only ONE caption line before the first child row.
    %% Measured in Mermaid 11.4.0: clearance = 13.5 - 24 x (lines - 1) user units, so a
    %% two-line caption already paints over the first node. Browser-measured on a 20px
    %% sans ramp as well: a 17-character caption stays on one line, 21 characters wrap.
    %% Keep every caption to ONE line -- at most ~17 characters and no em dash. The
    %% detail these captions used to carry is stated in the legend keys and in the
    %% cited prose around this figure.
    subgraph Legend_A3["Legend"]
        LG1["Solid box = source-present module (SPA does NOT build today)"]
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

    subgraph Comp["Components (8)"]
        Header["Header"]
        Sidebar["Sidebar"]
        Chart["Chart"]
        VaultList["VaultList"]
        VaultDetails["VaultDetails"]
        TxForm["TransactionForm"]
        TxList["TransactionList"]
        SigReq["SignatureRequest"]
    end

    subgraph Slices["Registered slices"]
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

As the `Legend_A3` subgraph in **Fig A3** states, solid boxes and solid arrows denote source-present modules and their intended import/dispatch wiring — all **Implemented-with-defects (source-present, non-buildable)**, since the SPA does not build: `app.tsx` is written to compose the store and mount the five routed pages (**source-present, non-buildable**); the store registers the `vault`, `transaction`, and `user` slices (**source-present, non-buildable**); and the `Header`, `Sidebar`, `VaultList`, `VaultDetails`, `TransactionForm`, `TransactionList`, and `Chart` components are coded to read from or dispatch to those registered slices (**source-present, non-buildable**). `Source: frontend/src/app.tsx:L16-L34`, `Source: frontend/src/store/index.ts:L8-L12`. The dashed boxes `analyticsSlice (ABSENT)` and `signatureSlice (ABSENT)`, together with the dashed arrows into them, mark the two broken references (**source-present defect**): the `Analytics` page and the `SignatureRequest` component import from store slices that do not exist and that the store never registers. `Source: frontend/src/pages/Analytics.tsx:L7`, `Source: frontend/src/components/SignatureRequest.tsx:L3`, `Source: frontend/src/store/index.ts:L8-L12`. Both defects are dissected in the [Known Gaps and Divergences](#known-gaps-and-divergences) section.

## Pages and Routing

The router mounts five page components, each wrapped by the shared `Header` and `Sidebar` from the application shell. `Source: frontend/src/app.tsx:L20-L34`. The route-to-page mapping is declared directly in `app.tsx`.

| Route | Page component | Purpose | Maturity |
|-------|----------------|---------|----------|
| `/` | `Dashboard` | Landing overview that aggregates vaults, transactions, and a summary `Chart`; dispatches `fetchVaults` and `fetchTransactions` on mount. | Source-present (non-buildable) |
| `/vault-management` | `VaultManagement` | Create, list, and inspect custodial vaults via `VaultList` and `VaultDetails`; dispatches `fetchVaults`/`createVault`. | Source-present (non-buildable) |
| `/transaction-processing` | `TransactionProcessing` | Submit new transactions through `TransactionForm` and track them via `TransactionList`; dispatches `createTransaction`/`fetchTransactions`. | Source-present (non-buildable) |
| `/signature-management` | `SignatureManagement` | Request and monitor signatures via `SignatureRequest`; imports `requestSignature`/`checkSignatureStatus` from the absent `signatureSlice`. | Source-present (non-buildable) |
| `/analytics` | `Analytics` | Render analytics visualizations via `Chart`; imports `fetchAnalyticsData` from the absent `analyticsSlice` and reads `state.analytics.data`. | Source-present (non-buildable) |

The route declarations are at `Source: frontend/src/app.tsx:L25-L29`. The per-page slice wiring is verifiable in the page sources: `Dashboard` dispatches `fetchVaults`/`fetchTransactions` `Source: frontend/src/pages/Dashboard.tsx:L9-L10`; `VaultManagement` dispatches `fetchVaults`/`createVault` `Source: frontend/src/pages/VaultManagement.tsx:L8`; `TransactionProcessing` dispatches `createTransaction`/`fetchTransactions` `Source: frontend/src/pages/TransactionProcessing.tsx:L8`; `SignatureManagement` imports from the absent `signatureSlice` `Source: frontend/src/pages/SignatureManagement.tsx:L7`; and `Analytics` imports from the absent `analyticsSlice` `Source: frontend/src/pages/Analytics.tsx:L7`.

## Shared Components

Eight reusable components live under `frontend/src/components`. Each is **source-present but non-buildable**; where a component references an absent store slice it is additionally labeled a **source-present defect** and detailed in [Known Gaps and Divergences](#known-gaps-and-divergences).

| Component | Role | Store / utility dependencies | Maturity |
|-----------|------|------------------------------|----------|
| `Chart` | Data-visualization wrapper exposing `Line`, `Bar`, and `Pie` renderers. | chart.js, react-chartjs-2 (no store) | Source-present (non-buildable) |
| `Header` | Top navigation bar that reflects the current user. | `selectUser` from `userSlice` | Source-present (non-buildable) |
| `Sidebar` | Side navigation that reflects the current user. | `selectUser` from `userSlice` | Source-present (non-buildable) |
| `VaultList` | Lists vaults and renders `VaultDetails` for each. | `selectVaults`/`fetchVaults` from `vaultSlice` | Source-present (non-buildable) |
| `VaultDetails` | Shows a vault's detail and embeds `TransactionList`. | `utils/formatters` (`formatCurrency`, `truncateAddress`) | Source-present (non-buildable) |
| `TransactionForm` | Form that validates input and dispatches new transactions. | `createTransaction` from `transactionSlice`; `utils/validators` | Source-present (non-buildable) |
| `TransactionList` | Lists transactions with formatted amounts and dates. | `selectTransactions` from `transactionSlice`; `utils/formatters` | Source-present (non-buildable) |
| `SignatureRequest` | Requests a signature and polls its status. | `requestSignature`/`checkSignatureStatus` from the absent `signatureSlice`; `utils/formatters` | Source-present (non-buildable) |

Component wiring is verifiable in each source file: `Source: frontend/src/components/Chart.tsx:L2-L3`, `Source: frontend/src/components/Header.tsx:L3-L4`, `Source: frontend/src/components/Sidebar.tsx:L3-L4`, `Source: frontend/src/components/VaultList.tsx:L3-L4`, `Source: frontend/src/components/VaultDetails.tsx:L2-L3`, `Source: frontend/src/components/TransactionForm.tsx:L3-L4`, `Source: frontend/src/components/TransactionList.tsx:L3-L4`, `Source: frontend/src/components/SignatureRequest.tsx:L3-L4`.

## Services

Three service modules under `frontend/src/services` mediate all communication with the backend. The Axios client is the REST transport; `auth.ts` manages the session; and `websocket.ts` provides the realtime channel.

| Service | Responsibility | Key notes | Maturity |
|---------|----------------|-----------|----------|
| `api.ts` | Axios instance factory for backend REST calls. | Request interceptor attaches `Authorization: Bearer <token>`; response interceptor carries a 401-refresh TODO; calls plural paths `GET /vaults`, `POST /transactions`, `GET /signatures/:id`. | Source-present (non-buildable) |
| `auth.ts` | Session helpers `login`, `logout`, `isAuthenticated`. | `login` posts to `/auth/login`; persists the JWT via `utils/storage` (absent); imports `createApiInstance`, which `api.ts` does not export. | Source-present (non-buildable) |
| `websocket.ts` | `WebSocketService` realtime channel. | On open, sends `{ type: 'authenticate', token }`; reads the token from `utils/auth` (absent). | Source-present (non-buildable) |

The Axios request interceptor attaches the bearer token on every outbound call (**source-present, non-buildable**). `Source: frontend/src/services/api.ts:L11-L17`:

```ts
const token = await getAuthToken();
if (token) config.headers['Authorization'] = `Bearer ${token}`;
```

The response interceptor is a pass-through with an outstanding 401-refresh TODO (**source-present, non-buildable**, incomplete). `Source: frontend/src/services/api.ts:L19-L27`. The REST helpers call plural resource paths that diverge from the backend router. `Source: frontend/src/services/api.ts:L32-L46`. The session helpers post to `/auth/login` and persist the JWT. `Source: frontend/src/services/auth.ts:L4-L17`. The realtime channel authenticates on open by sending an `authenticate` message with the token. `Source: frontend/src/services/websocket.ts:L14-L21`.

## State Management (Redux Store)

The Redux store is assembled by a single `configureStore` call that registers exactly three reducers — `vault`, `transaction`, and `user` — with the Redux DevTools enhancer gated on `NODE_ENV`. `Source: frontend/src/store/index.ts:L8-L13` (**source-present, non-buildable**). The module exports only the `RootState` and `AppDispatch` types derived from the configured store; it does **not** export typed `useAppSelector`/`useAppDispatch` hooks, yet pages and components import those hooks from `@/store`, so those imports are unresolved — a compile-blocking defect. `Source: frontend/src/store/index.ts:L21-L22` (**source-present defect**).

| Registered reducer | Store key | Primary consumers | Maturity |
|--------------------|-----------|-------------------|----------|
| `vaultReducer` | `vault` | `VaultList`, `VaultManagement`, `Dashboard` | Source-present (non-buildable) |
| `transactionReducer` | `transaction` | `TransactionForm`, `TransactionList`, `TransactionProcessing`, `Dashboard` | Source-present (non-buildable) |
| `userReducer` | `user` | `Header`, `Sidebar` | Source-present (non-buildable) |

Critically, the store registers no `analytics` reducer and no `signature` reducer, so the `state.analytics.data` read in `Analytics` and the `signatureSlice` dispatches in `SignatureRequest` and `SignatureManagement` resolve against slices that are never mounted (**source-present defect**). `Source: frontend/src/store/index.ts:L8-L12`, `Source: frontend/src/pages/Analytics.tsx:L15`, `Source: frontend/src/components/SignatureRequest.tsx:L3`.


## Client-Side Validation (Zod Schemas)

Three schema modules under `frontend/src/schema` declare the client-side validation contract, one per domain resource. Each module defines a TypeScript class whose constructor assigns a `z.object({ … })` to a public `schema` field. `Source: frontend/src/schema/transaction.ts:L3-L16`, `Source: frontend/src/schema/user.ts:L3-L14`, `Source: frontend/src/schema/vault.ts:L3-L14`. All three are **source-present but non-buildable**: each imports `zod`, which `frontend/package.json` does not declare, so no schema module resolves. `Source: frontend/src/schema/transaction.ts:L1`, `Source: frontend/src/schema/user.ts:L1`, `Source: frontend/src/schema/vault.ts:L1`, `Source: frontend/package.json:L5-L19`.

Two further facts qualify the maturity of client-side validation, and both are load-bearing. First, **no module under `frontend/src` imports any of the three schemas** — they are declared but never consumed, so even once the build blockers are resolved no Zod validation would run. Second, the only input validation actually wired into a component is hand-rolled: `TransactionForm` checks the amount inline and the recipient address with `isValidEthereumAddress`/`isValidXRPAddress` from `utils/validators`, and never references `TransactionSchema`. `Source: frontend/src/components/TransactionForm.tsx:L4,L23-L28`, `Source: frontend/src/utils/validators.ts:L8,L16`. Zod-enforced validation is therefore **Designed** in effect — the schema source exists, but nothing enforces it. The three modules deliberately do **not** appear in **Fig A3**: nothing imports them, so there is no import or dispatch edge to draw, and their absence from the component-and-state graph is itself the finding.

| Schema module | Declared symbol | Exported? | Mirrors backend entity | Maturity |
|---------------|-----------------|-----------|------------------------|----------|
| `schema/transaction.ts` | `TransactionSchema` | Yes (`export class`) | `db.Transaction` | Source-present (non-buildable); never imported |
| `schema/user.ts` | `UserSchema` | Yes (`export class`) | `db.User` | Source-present (non-buildable); never imported |
| `schema/vault.ts` | `VaultSchema` | **No** — module-private | `db.Vault` | Source-present defect (unimportable); never imported |

`Source: frontend/src/schema/transaction.ts:L3`, `Source: frontend/src/schema/user.ts:L3`, `Source: frontend/src/schema/vault.ts:L3`.

### `TransactionSchema` fields

| Field | Zod validator | Backend counterpart | Note |
|-------|---------------|---------------------|------|
| `id` | `z.string()` | `ID uuid.UUID` | No UUID format check on the client |
| `vaultId` | `z.string()` | `VaultID uuid.UUID` | No UUID format check on the client |
| `status` | `z.enum(['Pending','Completed','Failed'])` | `Status string` (`Pending` / `Processed`) | Vocabulary divergence — see below |
| `blockchainType` | `z.enum(['XRP','Ethereum'])` | `BlockchainType string` (unconstrained) | Enumeration exists only client-side |
| `txHash` | `z.string()` | `TxHash string` | — |
| `amount` | `z.number()` | `Amount decimal.Decimal` | Client narrows an arbitrary-precision decimal to a JS number |
| `createdAt` | `z.string().datetime()` | `CreatedAt time.Time` | ISO-8601, no precision constraint |

`Source: frontend/src/schema/transaction.ts:L8-L14`, `Source: backend/internal/db/schema.go:L44-L56`. The backend's `UserID`, `Metadata`, and `UpdatedAt` fields have no client-side counterpart.

### `UserSchema` fields

| Field | Zod validator | Backend counterpart | Note |
|-------|---------------|---------------------|------|
| `id` | `z.string()` | `ID uuid.UUID` | No UUID format check on the client |
| `username` | `z.string()` | `Username string` | — |
| `email` | `z.string().email()` | `Email string` | Format check exists only client-side |
| `role` | `z.enum(['Admin','Manager','Operator','Auditor'])` | `Role string` (unconstrained) | **Omits `API User`** — four of the five documented roles |
| `createdAt` | `z.string().datetime({ precision: 3 })` | `CreatedAt time.Time` | Millisecond precision required |

`Source: frontend/src/schema/user.ts:L8-L12`, `Source: backend/internal/db/schema.go:L20-L30`. The backend's `OrganizationID`, `PasswordHash`, and `UpdatedAt` fields have no client-side counterpart: omitting `PasswordHash` is correct — a password hash must never reach the client — but omitting `OrganizationID` drops the multi-tenancy key that the vault and transaction flows scope on.

### `VaultSchema` fields

| Field | Zod validator | Backend counterpart | Note |
|-------|---------------|---------------------|------|
| `id` | `z.string()` | `ID uuid.UUID` | No UUID format check on the client |
| `name` | `z.string()` | `Name string` | — |
| `blockchainType` | `z.enum(['XRP','Ethereum'])` | `BlockchainType string` (unconstrained) | Enumeration exists only client-side |
| `address` | `z.string()` | `Address string` | No chain-specific address check in the schema |
| `createdAt` | `z.string().datetime({ precision: 3 })` | `CreatedAt time.Time` | Millisecond precision required |

`Source: frontend/src/schema/vault.ts:L8-L12`, `Source: backend/internal/db/schema.go:L32-L42`. The backend's `OrganizationID`, `Metadata`, and `UpdatedAt` fields have no client-side counterpart.

### Divergences carried by the schemas

- **Role enumeration — four client values versus five documented roles (source-present defect).** `UserSchema` validates `role` against `['Admin','Manager','Operator','Auditor']`, omitting `API User`, whereas the design corpus and this documentation set both define a five-role RBAC model. `Source: frontend/src/schema/user.ts:L11`, `Source: documentation/Technical Specifications.md:L494-L498`, [`../security/security-model.md`](../security/security-model.md). A user whose role is `API User` would therefore fail client-side validation while remaining valid on the backend, where `Role` is an unconstrained `string` with no enumeration, check constraint, or middleware enforcement. `Source: backend/internal/db/schema.go:L27`. Because RBAC enforcement is itself **Designed** — the auth middleware is absent — the divergence is latent rather than active today, and it is cataloged in [`scaffold-vs-design.md`](scaffold-vs-design.md).
- **`VaultSchema` is declared without `export` (source-present defect).** `vault.ts` declares `class VaultSchema`, while its two siblings declare `export class`, so the vault contract is module-private and no consumer can import it. `Source: frontend/src/schema/vault.ts:L3`, `Source: frontend/src/schema/transaction.ts:L3`, `Source: frontend/src/schema/user.ts:L3`. Because the class is also never referenced inside its own module and `frontend/tsconfig.json` sets `noUnusedLocals: true`, the declaration is additionally reported as an unused local during type-checking. `Source: frontend/tsconfig.json:L15`.
- **Identifiers are plain strings.** All three schemas type `id` — and `TransactionSchema` also types `vaultId` — as `z.string()` with no UUID validator, while every backend entity keys on `uuid.UUID`. `Source: frontend/src/schema/vault.ts:L8`, `Source: frontend/src/schema/transaction.ts:L8-L9`, `Source: backend/internal/db/schema.go:L34`. A malformed identifier passes client validation and is rejected only at the database boundary; the backend's own identifier conflict is covered by the dual-identifier note in [`data-model.md`](data-model.md).
- **Chain enumerations and address formats live only on the client.** `blockchainType` is constrained to `XRP` / `Ethereum` in both `VaultSchema` and `TransactionSchema`, but the corresponding backend fields are plain unconstrained strings, so the enumeration is **Designed** on the server. `Source: frontend/src/schema/vault.ts:L10`, `Source: frontend/src/schema/transaction.ts:L11`, `Source: backend/internal/db/schema.go:L37,L50`. Chain-specific address validation exists separately in `utils/validators` and is not referenced by any schema. `Source: frontend/src/utils/validators.ts:L8,L16`, `Source: frontend/src/schema/vault.ts:L11`.
- **Transaction status vocabulary and amount typing.** `TransactionSchema` validates `Pending` / `Completed` / `Failed` against a backend that produces only `Pending` / `Processed`, and types `amount` as a number against a `decimal.Decimal` that serializes as a JSON string. Both divergences are detailed in [API path and status vocabulary divergences](#api-path-and-status-vocabulary-divergences-note) below and in [`../api-reference/transactions.md`](../api-reference/transactions.md). `Source: frontend/src/schema/transaction.ts:L10,L13`, `Source: backend/internal/db/schema.go:L52`.

## Known Gaps and Divergences

The frontend scaffold is **source-present but non-buildable** as a component tree and routing shell, and it carries concrete defects and cross-boundary divergences. Consistent with the documentation-only scope of this deliverable, each is **documented, not fixed**; the code is left unmodified. The consolidated Implemented / Provisioned / Designed reconciliation is maintained in [`scaffold-vs-design.md`](scaffold-vs-design.md), and the resource-path contract is authoritative in [`../api-reference/overview.md`](../api-reference/overview.md).

### Broken `analyticsSlice` reference (source-present defect)

The `Analytics` page imports `fetchAnalyticsData` from `@/store/analyticsSlice` and reads `state.analytics.data`, but no `analyticsSlice` module exists in `frontend/src/store` and the store registers no `analytics` reducer. `Source: frontend/src/pages/Analytics.tsx:L7`, `Source: frontend/src/pages/Analytics.tsx:L15`, `Source: frontend/src/store/index.ts:L8-L12`. As a result, the `Analytics` page cannot resolve its state at runtime — the selector reads an undefined slice and the dispatched thunk has no reducer to service it. This is the dashed `analyticsSlice (ABSENT)` node and its dashed inbound arrow in **Fig A3**.

### Broken `signatureSlice` reference (related source-present defect)

The `SignatureRequest` component imports `requestSignature` and `checkSignatureStatus` from `@/store/signatureSlice`, which is likewise absent from the store. `Source: frontend/src/components/SignatureRequest.tsx:L3`, `Source: frontend/src/store/index.ts:L8-L12`. The same absent slice is imported by the `SignatureManagement` page. `Source: frontend/src/pages/SignatureManagement.tsx:L7`. This is the dashed `signatureSlice (ABSENT)` node and its dashed inbound arrow in **Fig A3**; both the component and the page fail to resolve their signature actions at runtime.

### API path and status vocabulary divergences (note)

The Axios client calls plural resource paths — `GET /vaults`, `POST /transactions`, and `GET /signatures/:id` — whereas the backend router exposes the singular vault group `/vault/*` alongside `/transactions/*` and `/signatures/*`, so the vault calls in particular do not line up. `Source: frontend/src/services/api.ts:L32-L46`. Independently, the client-side Zod transaction schema uses the status vocabulary `Pending | Completed | Failed`, which diverges from the backend's `Pending | Processed`. `Source: frontend/src/schema/transaction.ts:L10`. These divergences are cataloged in full in [`scaffold-vs-design.md`](scaffold-vs-design.md) and the endpoint contract is detailed in [`../api-reference/overview.md`](../api-reference/overview.md) (**Designed** reconciliation pending).

### Absent utility modules (source-present defect)

Three service modules import from utility modules that do not exist. `websocket.ts` and `api.ts` import `getAuthToken` from `utils/auth`, and `auth.ts` imports `setItem`/`getItem`/`removeItem` from `utils/storage`, but the `frontend/src/utils` directory contains only `formatters.ts` and `validators.ts`. `Source: frontend/src/services/websocket.ts:L1`, `Source: frontend/src/services/api.ts:L2`, `Source: frontend/src/services/auth.ts:L2`. Consequently, token retrieval and JWT persistence have no backing implementation today (**source-present defect**).

### Create React App HTML shell carries another product's branding (source-present defect)

The Create React App HTML shell that hosts the SPA is not this product's shell. `frontend/public/index.html` sets the document title to `Collaborative Task Manager` and the `description` meta tag to `Collaborative Task Management Application` — neither names the Blockchain Integration Service and Dashboard, and both are leftovers from an unrelated application. `Source: frontend/public/index.html:L7,L9`. The same shell links a favicon at `%PUBLIC_URL%/favicon.ico`, but `frontend/public/` contains `index.html` and nothing else, so that request would return 404 once the app is served. `Source: frontend/public/index.html:L8`. Neither issue is compile-blocking — Create React App copies `public/` through to the build output verbatim — so the defect surfaces in the browser tab, the document metadata, and any link preview or crawler that reads the `description`, rather than at build time. Consistent with the documentation-only scope, both are **documented, not fixed**; they are cataloged as Defect 13 in [`scaffold-vs-design.md`](scaffold-vs-design.md).

### Additional verified scaffold defects (note)

Two further inconsistencies were confirmed first-hand while mapping the shell and services, and are recorded here for completeness. First, `app.tsx` imports `AuthProvider` from `@/services/auth`, but `auth.ts` exports only `login`, `logout`, and `isAuthenticated` — no `AuthProvider` symbol is defined. `Source: frontend/src/app.tsx:L12`, `Source: frontend/src/services/auth.ts:L4-L43` (**source-present defect**). Second, `auth.ts` imports `createApiInstance` from `api.ts`, yet `api.ts` declares `createApiInstance` as a non-exported local constant and exports only `getVaults`, `createTransaction`, and `getSignatureStatus`. `Source: frontend/src/services/auth.ts:L1`, `Source: frontend/src/services/api.ts:L6`, `Source: frontend/src/services/api.ts:L32-L44` (**source-present defect**). Finally, several runtime libraries the source imports — `@reduxjs/toolkit`, `react-redux`, `chart.js`, `react-chartjs-2`, `zod`, and `axios` — are not declared in `frontend/package.json`, which lists only `react`, `react-dom`, `react-router-dom`, `react-scripts`, and testing utilities. `Source: frontend/package.json` (**Designed** dependency reconciliation pending). These are documented here and reconciled in [`scaffold-vs-design.md`](scaffold-vs-design.md).

### Stale product identity and absent CRA public assets (source-present defects)

The static shell that Create React App serves for every route is `frontend/public/index.html`, and it still carries the identity of an **entirely different product**: its description reads `Collaborative Task Management Application` and its title is `Collaborative Task Manager` — no mention of vaults, blockchain, or this dashboard. `Source: frontend/public/index.html:L7,L9`. This is not a cosmetic detail confined to source: the CRA dev server serves this shell verbatim (with the bundle `<script>` tag injected), so it is the title a developer sees in the browser tab, and the description a crawler or link preview would read, on **every** route — including while the bundle is failing to compile. `Source: frontend/public/index.html:L1-L15`, `Source: frontend/package.json:L21`.

The same directory is missing the rest of the standard CRA public set. `frontend/public/` contains **only** `index.html` (508 bytes); `favicon.ico`, `manifest.json`, `robots.txt`, and the `logo*.png` images are all absent. `Source: frontend/public/ (single file: index.html)`. Two consequences follow, and the second is the misleading one:

- The shell requests an icon that does not exist — `<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />`. `Source: frontend/public/index.html:L8`.
- Because the dev server answers unknown paths with the SPA history fallback, `GET /favicon.ico` returns **HTTP 200** with `Content-Type: text/html` and the same shell bytes as `/` (identical `ETag`) rather than a 404. A reader checking status codes sees `200` and may conclude the asset exists; the browser receives HTML where an icon is expected and renders **no** site icon. The absent `manifest.json` is likewise never linked from the shell, so there is no web-app manifest, and no `robots.txt` is published.

**Maturity: Source-present defect** for the stale identity (the file exists and is served, with the wrong content) and **Designed** for the absent assets (retitling the shell to this product, supplying `favicon.ico`/`manifest.json`/`robots.txt`/logo images, and adding the `<link rel="manifest">` reference). Consistent with the documentation-only scope, both are **documented here, not fixed** — `frontend/public/index.html` is unmodified. They are catalogued as Defect 13 in [`scaffold-vs-design.md`](scaffold-vs-design.md#defect-catalog), and the runtime behavior a developer observes is described in [`../getting-started/local-development.md`](../getting-started/local-development.md#frontend-development-workflow-react--cra).

## Monitoring & Analytics (MA-001) — Feature Status and User Guidance

MA-001 (the Monitoring & Analytics Dashboard) is delivered on the frontend by the `Dashboard` and `Analytics` pages and the shared `Chart` component, backed — in the designed target — by the observability stack documented in [`../operations/observability.md`](../operations/observability.md). Because the SPA does not build and the `analyticsSlice` is absent, **no part of MA-001 renders today**. The end-user workflow (open the dashboard, read each panel, act on missing data) is authored canonically in the *Monitoring & Analytics (MA-001)* section of the operations guide; the capability/status matrix below is the frontend-side summary and honest status for each MA-001 subrequirement drawn from the SRS.

| MA-001 capability | Delivery surface | Status | Source / Reference |
|-------------------|------------------|--------|--------------------|
| Dashboard overview (vault + transaction summary with summary `Chart`) | `Dashboard` page + `Chart` | Source-present (non-buildable) | `Source: frontend/src/pages/Dashboard.tsx:L9-L10` |
| Analytics visualizations | `Analytics` page + `Chart` | Source-present (non-buildable); broken `analyticsSlice` reference | `Source: frontend/src/pages/Analytics.tsx:L7,L15` |
| Real-time metric feed | `websocket.ts` channel + backend `/metrics` | Designed (no backend WebSocket route; `/metrics` absent) | `Source: frontend/src/services/websocket.ts:L1`; [`../operations/observability.md`](../operations/observability.md) |
| Custom reports / export | — | Designed (not present in code) | `Source: documentation/Software Requirements Specifications (SRS).md:§Features (MA-001)` |
| Alerting / notifications | — | Designed | [`../operations/runbook.md`](../operations/runbook.md) |
| Troubleshooting workflow | operations guide | Documented (static, no runtime) | [`../operations/observability.md`](../operations/observability.md) |

For the step-by-step monitoring-and-analytics user workflow and troubleshooting, see the *Monitoring & Analytics (MA-001)* section of [`../operations/observability.md`](../operations/observability.md). Prerequisites for running the SPA at all (undeclared dependencies, `@/` alias, absent slices) are covered in [`../getting-started/local-development.md`](../getting-started/local-development.md).

## Documentation & Training Index

New engineers and operators onboard through the guides below; each is task-oriented (setup, usage, troubleshooting) and labels every capability with its maturity. This index is the frontend-side training map for the five SRS features and the onboarding/deployment paths; the documentation set's root navigation page, [`../index.md`](../index.md), is the published entry point that indexes every section.

| Audience task | Guide | Feature / Area |
|---------------|-------|----------------|
| Manage vaults | [`../guides/vault-management.md`](../guides/vault-management.md) | VM-001 |
| Process transactions | [`../guides/transaction-processing.md`](../guides/transaction-processing.md) | TP-001 |
| Request and monitor signatures | [`../guides/signature-management.md`](../guides/signature-management.md) | SG-001 |
| Authenticate and manage access | [`../api-reference/authentication.md`](../api-reference/authentication.md) | UA-001 |
| Monitor and analyze | [`../operations/observability.md`](../operations/observability.md) | MA-001 |
| Install and configure locally | [`../getting-started/installation.md`](../getting-started/installation.md), [`../getting-started/configuration.md`](../getting-started/configuration.md) | Onboarding |
| Deploy | [`../guides/deployment.md`](../guides/deployment.md) | Operations |

## Related Documentation

The frontend architecture is one page in a set of sibling architecture and reference documents:

- [`overview.md`](overview.md) — the system overview and the backend before/after pair, **Fig A1 — Current Implemented Scaffold** and **Fig A2 — Designed Target Architecture**.
- [`backend.md`](backend.md) — the Go/Gin layered modular monolith, dependency injection, and wiring-gap detail.
- [`data-flow.md`](data-flow.md) — the authentication, transaction-settlement, and signature sequences plus the end-to-end data flow that the pages and services above participate in.
- [`data-model.md`](data-model.md) — the five persisted entities and their relationships in **Fig M1 — Data Model ERD** ([`data-model.md#fig-m1--data-model-erd`](data-model.md#fig-m1--data-model-erd)), which the client-side Zod schemas mirror.
- [`scaffold-vs-design.md`](scaffold-vs-design.md) — the consolidated Implemented / Provisioned / Designed matrix that reconciles every gap named on this page.
- [`../api-reference/overview.md`](../api-reference/overview.md) — the authoritative public HTTP contract for the 18 endpoints, including the resource-path reconciliation.

Feature-level walkthroughs for the pages documented above are provided in the user guides: [`../guides/vault-management.md`](../guides/vault-management.md), [`../guides/transaction-processing.md`](../guides/transaction-processing.md), and [`../guides/signature-management.md`](../guides/signature-management.md).

