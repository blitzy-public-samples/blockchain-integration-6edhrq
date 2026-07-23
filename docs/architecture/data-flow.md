# Data Flow & Sequences

This reference documents how data moves through the Blockchain Integration Service and Dashboard at runtime, tracing each request from the React frontend through the Gin router and its handlers into the core services, the PostgreSQL system of record, and the Redis cache. The backend follows a **command/settlement split**: the synchronous *command* path accepts a request and persists it in a `Pending` state, while an asynchronous *settlement* path — driven by ticker-based background processors — later advances the record toward its terminal state. `Source: backend/internal/core/transaction/service.go:L29-L85`, `Source: backend/internal/tasks/transaction_processor.go:L13-L61`. Four named figures capture this behavior: **Fig B1 — Authentication Sequence**, **Fig B2 — Transaction Create + Async Settlement**, **Fig B3 — Signature Generation + Kafka Publish (Designed)**, and **Fig DF1 — End-to-End Data Flow**; each is discussed in prose only after it has been introduced by name, in keeping with the documentation set's diagram-first convention.

## Maturity Legend

Every capability and every step named on this page is tagged with the project-wide maturity discipline, consistent with the labeling used across the documentation set and in [`backend.md`](backend.md) and [`data-model.md`](data-model.md):

- **Implemented** — present and functional in the code as-declared today.
- **Provisioned** — scaffolding or configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified in the design corpus (`documentation/*.md`), not yet present in code.

The consolidated Implemented / Provisioned / Designed matrix that reconciles the design corpus with the on-disk scaffold is maintained in [`scaffold-vs-design.md`](scaffold-vs-design.md).

## Diagram Conventions

The four figures on this page share one notation so the boundary between what runs and what is merely referenced stays legible:

- In the sequence diagrams (**Fig B1**, **Fig B2**, **Fig B3**), a participant tagged **`(ABSENT)`** is a package that the code imports but that does not exist in the tree — for example `internal/core/auth`, `internal/blockchain`, and `internal/custodian`. `Source: backend/internal/api/handlers/auth.go:L5`, `Source: backend/internal/core/transaction/service.go:L7-L8`.
- Steps that belong to the asynchronous settlement path or the Kafka fan-out are labeled **Implemented** or **Designed** inline (and in each figure's legend), so a reader can tell working code from intended target at a glance.
- In the flowchart (**Fig DF1**), a solid arrow is an **Implemented** data path and a dashed arrow is a **Designed** (or absent) path, as stated in that figure's embedded `Legend_DF1` block.

Each figure below carries a descriptive title and a legend, and is referenced by name from the surrounding prose, per the visual-architecture documentation rule (AAP §0.10.1).

## Fig B1 — Authentication Sequence

**Fig B1 — Authentication Sequence** traces a login attempt from the browser to the database and back: the user submits credentials, the frontend `auth.ts` client issues `POST /auth/login`, the Gin router dispatches to `AuthHandler.Login`, and the handler delegates to the `AuthService`. The `alt` fragment shows the two terminal outcomes — a `200 {token}` on valid credentials, or a `401 {error}` otherwise. This login handler is **Implemented**; the service it calls is **Designed/Absent** (see the legend). `Source: backend/internal/api/handlers/auth.go:L21-L39`, `Source: backend/internal/api/routes.go:L19`.

**Figure B1 — Authentication Sequence (login flow, as-wired today)**

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend (auth.ts)
    participant R as Gin Router (/auth)
    participant H as AuthHandler
    participant S as AuthService (core/auth, ABSENT)
    participant DB as PostgreSQL
    U->>F: Enter username + password
    F->>R: POST /auth/login {username, password}
    R->>H: Login(c)
    H->>S: Login(username, password)
    S->>DB: Verify user + password hash
    DB-->>S: User record
    S-->>H: JWT token or error
    alt valid credentials
        H-->>F: 200 {token}
        F-->>U: Store token, show dashboard
    else invalid credentials
        H-->>F: 401 {error: "Invalid credentials"}
    end
```

**Legend — Fig B1**

Mermaid `sequenceDiagram` does not support an in-diagram legend, so the participant notation is explained here:

- **U** — the end user; **F** — the frontend auth client (`frontend/src/services/auth.ts`); **R** — the Gin router group `/auth`; **H** — `AuthHandler` (**Implemented**); **DB** — the PostgreSQL system of record.
- **S — `AuthService (core/auth, ABSENT)`** — the handler imports `backend/internal/core/auth` and holds an `*auth.AuthService`, but that package is **not present** in the tree. The service is therefore **Designed/Absent**, even though the handler that calls it is **Implemented**. `Source: backend/internal/api/handlers/auth.go:L5,L21-L39`.
- The `alt` fragment names the two response branches: `200 {token}` (success) and `401 {error: "Invalid credentials"}` (failure). `Source: backend/internal/api/handlers/auth.go:L32-L38`.
- Design reference for this flow: `Source: documentation/Technical Specifications.md:§SEQUENCE DIAGRAMS (User Authentication)`.

## Fig B2 — Transaction Create + Async Settlement

**Fig B2 — Transaction Create + Async Settlement** shows the backend's command/settlement split for transactions. On the synchronous **command** path (**Implemented**), `POST /transactions/create` reaches `TransactionService.CreateTransaction(userID, vaultID, toAddress, amount)`, which reads the source vault via `GetVaultByID`, builds an unsigned transaction through the blockchain client, and persists a `Transaction` with `Status = Pending`. `Source: backend/internal/core/transaction/service.go:L29-L56`, `Source: backend/internal/api/routes.go:L37`. On the asynchronous **settlement** path, the `TransactionProcessor` ticker would poll `GetPendingTransactions`, call `ProcessTransaction(id)`, sign via the custodian, broadcast via the blockchain client, and advance the record to `Status = Processed` with its `TxHash` before caching the result in Redis under `tx:<id>`. `Source: backend/internal/tasks/transaction_processor.go:L34-L58`, `Source: backend/internal/core/transaction/service.go:L65-L85`.

**Figure B2 — Transaction Create + Async Settlement (command path Implemented; settlement path panics)**

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend
    participant R as Gin Router (/transactions)
    participant TS as TransactionService
    participant BC as BlockchainClient (ABSENT)
    participant CU as CustodianClient (ABSENT)
    participant DB as PostgreSQL
    participant TP as TransactionProcessor (ticker)
    participant RD as Redis
    Note over U,RD: Command path is Implemented (sync) — settlement path PANICS (NewTicker(0))
    U->>F: Submit transaction
    F->>R: POST /transactions/create
    R->>TS: CreateTransaction(userID, vaultID, toAddress, amount)
    TS->>DB: GetVaultByID
    TS->>BC: CreateRawTransaction(...)
    TS->>DB: persist Transaction (Status = Pending)
    TS-->>F: 201 Created (Pending)
    TP->>DB: GetPendingTransactions
    TP->>TS: ProcessTransaction(id)
    TS->>CU: SignTransaction(rawTx)
    TS->>BC: BroadcastTransaction(signedTx)
    TS->>DB: update Status = Processed, TxHash
    TP->>RD: cache result (tx:<id>)
```

**Legend — Fig B2**

- **TS — `TransactionService`** (**Implemented**) owns both `CreateTransaction` (command) and `ProcessTransaction` (settlement). **TP — `TransactionProcessor (ticker)`** is the background poller. **RD — Redis** holds the cached settlement result. **BC** and **CU** are tagged **`(ABSENT)`** because `internal/blockchain` and `internal/custodian` are imported but not present in the tree. `Source: backend/internal/core/transaction/service.go:L7-L8`.
- **Status transition (backend vocabulary): `Pending` → `Processed`.** The service sets `db.TransactionStatusPending` on create and `db.TransactionStatusProcessed` on settlement; this backend vocabulary differs from the frontend's `Pending | Completed | Failed` schema, as noted in [`data-model.md`](data-model.md) and [`../api-reference/transactions.md`](../api-reference/transactions.md). `Source: backend/internal/core/transaction/service.go:L46,L81`.
- **The settlement path is Implemented in code but PANICS at startup.** `transactionCheckInterval` is declared as a package-level `time.Duration` and never initialized, so `time.NewTicker(transactionCheckInterval)` is effectively `time.NewTicker(0)`, which panics. As the diagram's `Note` records, the command path runs while the settlement ticker cannot start. This defect is documented, not fixed; the failure mode and its remediation are catalogued in [`backend.md`](backend.md#uninitialized-ticker-panic-implemented-defect-correction-designed) and the operations [`runbook.md`](../operations/runbook.md). `Source: backend/internal/tasks/transaction_processor.go:L13-L16`.

## Fig B3 — Signature Generation + Kafka Publish (Designed)

**Fig B3 — Signature Generation + Kafka Publish (Designed)** shows the signature lifecycle and the one designed extension to it. On the **Implemented** command path, `POST /signatures/create` reaches `SignatureService.RequestSignature(userID, vaultID, dataToSign)`, which persists a `Signature` with `Status = pending` and forwards the request to the custodian. `Source: backend/internal/core/signature/service.go:L24-L47`, `Source: backend/internal/api/routes.go:L47`. A real 5-minute ticker, `StartSignatureProcessor`, then polls `GetPendingSignatures` and calls `CheckSignatureStatus`; when the custodian reports the signature `Ready` it updates the database and caches the signature in Redis for 24 hours, and when it reports `Failed` it updates the database. `Source: backend/internal/tasks/signature_processor.go:L13,L46-L54`. The single **Designed** step is the Kafka publish of a `signature.ready` event when a signature becomes ready — it appears in the SRS process flowchart but no Kafka client exists in code. `Source: documentation/Software Requirements Specifications (SRS).md:§PROCESS FLOWCHART (Signature Generation Process)`.

**Figure B3 — Signature Generation + Kafka Publish (polling loop Implemented; Kafka publish Designed)**

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant F as Frontend
    participant R as Gin Router (/signatures)
    participant SS as SignatureService
    participant CU as CustodianClient (ABSENT)
    participant DB as PostgreSQL
    participant SP as SignatureProcessor (ticker 5m)
    participant RD as Redis
    participant K as Kafka (Designed)
    U->>F: Request signature (vault, data)
    F->>R: POST /signatures/create
    R->>SS: RequestSignature(userID, vaultID, dataToSign)
    SS->>DB: persist Signature (Status = pending)
    SS->>CU: RequestSignature(...)
    SS-->>F: 201 Created (pending)
    loop every 5 minutes (Implemented)
        SP->>DB: GetPendingSignatures
        SP->>SS: CheckSignatureStatus(id)
        SS->>CU: CheckSignatureStatus(id)
        alt ready
            SP->>DB: UpdateSignature(Ready)
            SP->>RD: cache signature (24h)
            SP-->>K: publish signature.ready [Designed]
        else failed
            SP->>DB: UpdateSignature(Failed)
        end
    end
```

**Legend — Fig B3**

- **SS — `SignatureService`** (**Implemented**) provides `RequestSignature` and `CheckSignatureStatus`. **SP — `SignatureProcessor (ticker 5m)`** is the background poller, whose interval is a real `const signatureCheckInterval = 5 * time.Minute` — unlike the transaction ticker of **Fig B2**, it does **not** panic. **CU** is tagged **`(ABSENT)`** because `internal/custodian` is imported but not present. **K — `Kafka (Designed)`** has no client in code. `Source: backend/internal/tasks/signature_processor.go:L13`, `Source: backend/internal/core/signature/service.go:L6`.
- **Status transition (backend vocabulary): `pending` → `Ready` / `Failed`.** `RequestSignature` persists `Status = "pending"`; the processor's `loop` advances the record to `Ready` (with a 24-hour Redis cache under `signature:<id>`) or to `Failed`. The `loop` and `alt` fragments in the figure mirror the polling interval and the ready/failed branches exactly. `Source: backend/internal/core/signature/service.go:L30`, `Source: backend/internal/tasks/signature_processor.go:L46-L58`.
- **`publish signature.ready [Designed]` is the only Designed step.** The `RequestSignature` call and the 5-minute polling loop are **Implemented**; the Kafka publish is **Designed** — drawn from the SRS Signature Generation Process, with no Kafka producer present in the code. `Source: backend/internal/tasks/signature_processor.go:L46-L54`, `Source: documentation/Software Requirements Specifications (SRS).md:§PROCESS FLOWCHART (Signature Generation Process)`.

## Fig DF1 — End-to-End Data Flow

**Fig DF1 — End-to-End Data Flow** places the per-scenario sequences above into the whole-system context, from the React UI to the persistence tier and outward to the designed integrations. It is a flowchart rather than a sequence because it depicts topology — which components exchange data — rather than an ordered exchange over time.

**Figure DF1 — End-to-End Data Flow (Implemented solid paths; Designed dashed paths)**

```mermaid
flowchart LR
    subgraph Legend_DF1["Legend"]
        LG1["Solid arrow = implemented data path"]
        LG2["Dashed arrow = designed / absent path"]
    end
    UI["React UI"] -->|"REST + JWT"| API["Gin Router + Handlers"]
    UI -.->|"WebSocket realtime (client only; server Designed)"| API
    API --> Core["Core Services: vault / transaction / signature"]
    Core --> PG[("PostgreSQL")]
    Core --> RD[("Redis cache")]
    Core --> Tasks["Ticker Processors"]
    Tasks --> PG
    Tasks --> RD
    Tasks -.->|"Designed"| Kafka["Kafka fan-out"]
    Kafka -.->|"Designed"| Analytics["Analytics / Reporting"]
    Analytics -.-> PG
    Core -.->|"Designed adapters"| Chain["Blockchain: XRP / Ethereum"]
    Core -.->|"Designed adapter"| Cust["Utxo Custodian"]
```

As the embedded `Legend_DF1` block in **Fig DF1** states, solid arrows are **Implemented** data paths and dashed arrows are **Designed** (or absent) paths. The **Implemented** paths are the ones exercised in **Fig B1**, **Fig B2**, and **Fig B3**: the React UI reaches the Gin router over REST with a JWT bearer token; the router delegates to the core services; and the core services and the ticker processors read and write PostgreSQL and the Redis cache. `Source: backend/internal/api/routes.go:L9-L54`, `Source: backend/internal/tasks/transaction_processor.go:L34-L58`. The WebSocket realtime channel is drawn dashed because it is only half-built: a frontend `WebSocketService` client class is authored, but **no backend WebSocket route exists**, so the end-to-end channel is **Designed** on the server side and cannot carry data today. This matches the WebSocket realtime channel row of the reconciliation matrix — **Implemented-with-defects** (client) / **Designed** (server) — and the Designed/Absent band of **Fig SD1** in [`scaffold-vs-design.md`](scaffold-vs-design.md). `Source: frontend/src/services/websocket.ts:L1-L11`, `Source: backend/internal/api/routes.go:L9-L54`. The **Designed** paths are the Kafka fan-out from the processors, the Analytics/Reporting consumer that reads from it, and the blockchain (XRP / Ethereum) and Utxo custodian adapters that the core services depend on through the `BlockchainClient` and `CustodianClient` ports — none of which are present in the tree today. `Source: documentation/Technical Specifications.md:§DATA-FLOW DIAGRAM`, `Source: backend/internal/core/transaction/service.go:L7-L8`.

## Related Documentation

- [`backend.md`](backend.md) — the layered modular monolith, dependency injection, and the wiring-gap catalogue behind these sequences (including the ticker panic referenced by **Fig B2**).
- [`overview.md`](overview.md) — the mandatory before/after architecture pair, **Fig A1 — Current Implemented Scaffold** ([`overview.md#fig-a1--current-implemented-scaffold-backend`](overview.md#fig-a1--current-implemented-scaffold-backend)) and **Fig A2 — Designed Target Architecture** ([`overview.md#fig-a2--designed-target-architecture`](overview.md#fig-a2--designed-target-architecture)).
- [`data-model.md`](data-model.md) — the entity definitions used by these flows, shown in **Fig M1 — Data Model ERD** ([`data-model.md#fig-m1--data-model-erd`](data-model.md#fig-m1--data-model-erd)).
- [`scaffold-vs-design.md`](scaffold-vs-design.md) — the consolidated Implemented / Provisioned / Designed reconciliation matrix.
- [`../api-reference/overview.md`](../api-reference/overview.md) — the public HTTP contract for the endpoints that originate these flows.
- [`../api-reference/transactions.md`](../api-reference/transactions.md) — the transaction endpoints and the `Pending` / `Processed` versus `Pending` / `Completed` / `Failed` status-vocabulary note referenced by **Fig B2**.
- [`../operations/runbook.md`](../operations/runbook.md) — failure modes and alerts, including the settlement-ticker panic surfaced in **Fig B2**.
