# Data Model Reference

The Blockchain Integration Service and Dashboard persists five entities — **Organization**, **User**, **Vault**, **Transaction**, and **Signature** — that model the custodial domain of organizations onboarding users who operate vaults to initiate transactions and request signatures. PostgreSQL is the system of record for all five entities. `Source: backend/internal/db/schema.go:L11-L68`, `Source: backend/internal/db/postgres.go:L1-L33`.

The entity **structs are source-present (non-buildable)** in the sense that they are declared as Go/GORM models in code — a *declared-in-source* status, not a claim that the model compiles or runs today. In fact, `schema.go` does not currently compile: it declares each `Metadata` field as `gorm.JSONMap`, a type that is **undefined in `gorm.io/gorm`** (Defect 4), so the entity structs cannot be built or exercised as-declared. `Source: backend/internal/db/schema.go:L39,L53,L65`. Separately, the **physical persistence wiring is Provisioned**: even setting the compile defect aside, the `db` package initializes a `sqlx` connection and defines no GORM `AutoMigrate`, `Repository`, or migrations, so the structs are not yet bound to a live schema. `Source: backend/internal/db/postgres.go:L10-L18`. The full defect catalog and cross-page reconciliation live in [`scaffold-vs-design.md`](scaffold-vs-design.md).

## Maturity Legend

Every capability and field-set in this reference is labeled with the project-wide maturity discipline:

- **Implemented** — present in code, building, and functional today. This is the operational-truth definition adopted across the entire documentation set; it is **reserved**, and at this checkpoint **nothing in this repository qualifies for it** (the backend has no `go.mod` and `schema.go` does not compile). `Source: backend/internal/db/schema.go:L39,L53,L65`.
- **Implemented-with-defects (source-present, non-buildable)** — the code exists as declared in source but does **not** compile, so no runtime behavior may be claimed. Every entity struct in this reference carries this status, never the unqualified **Implemented**. This matches the single operational-truth vocabulary defined in [`scaffold-vs-design.md`](scaffold-vs-design.md).
- **Provisioned** — configuration or scaffolding exists but is not yet wired to run (for example, the `db` package opens a `sqlx` connection but defines no `AutoMigrate`, `Repository`, or migrations).
- **Designed** — specified in the design corpus (`documentation/*.md`), not yet present in code.

The consolidated Implemented / Provisioned / Designed matrix that reconciles the design corpus with the on-disk scaffold is maintained in [`scaffold-vs-design.md`](scaffold-vs-design.md).

The entity-relationship model is shown in **Fig M1 — Data Model ERD** below, reproduced exactly as the GORM structs are declared in code, including the dual-identifier annotation discussed in the Gap Notes. `Source: backend/internal/db/schema.go:L11-L68`.

## Fig M1 — Data Model ERD

**Fig M1 — Data Model ERD (as declared in `backend/internal/db/schema.go`)**

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "has"
    ORGANIZATION ||--o{ VAULT : "owns"
    USER ||--o{ TRANSACTION : "initiates"
    USER ||--o{ SIGNATURE : "requests"
    VAULT ||--o{ TRANSACTION : "processes"
    VAULT ||--o{ SIGNATURE : "generates"

    ORGANIZATION {
        uuid ID PK "also embeds gorm.Model.ID (uint) - dual identifier"
        string Name
        string APIKey
        time CreatedAt
        time UpdatedAt
    }
    USER {
        uuid ID PK
        uuid OrganizationID FK
        string Username
        string Email
        string PasswordHash
        string Role
        time CreatedAt
        time UpdatedAt
    }
    VAULT {
        uuid ID PK
        uuid OrganizationID FK
        string Name
        string BlockchainType
        string Address
        JSONMap Metadata
        time CreatedAt
        time UpdatedAt
    }
    TRANSACTION {
        uuid ID PK
        uuid UserID FK
        uuid VaultID FK
        string Status
        string BlockchainType
        string TxHash
        decimal Amount
        JSONMap Metadata
        time CreatedAt
        time UpdatedAt
    }
    SIGNATURE {
        uuid ID PK
        uuid UserID FK
        uuid VaultID FK
        string Status
        string RawSignature
        JSONMap Metadata
        time CreatedAt
        time UpdatedAt
    }
```

**Legend — Fig M1**

Mermaid `erDiagram` does not support an in-diagram legend, so the notation is explained here:

- **`||--o{`** — a one-to-mandatory to zero-or-many relationship: exactly one parent record relates to zero or more child records (i.e. one parent "has many" children). The label in quotes (`"has"`, `"owns"`, `"initiates"`, `"requests"`, `"processes"`, `"generates"`) names the relationship.
- **`PK`** — primary key column.
- **`FK`** — a logical foreign-key *association*: a UUID field on the child entity (for example `OrganizationID`, `UserID`, `VaultID`) that names its parent by convention. This is a modeling notation only — the code declares these as plain `uuid.UUID` fields with **no** database foreign-key constraint, and no migration exists to create one (the `db` package opens a `sqlx` connection with no `AutoMigrate`). Referential integrity is therefore **Designed**, not enforced today. `Source: backend/internal/db/schema.go:L20-L68`, `Source: backend/internal/db/postgres.go:L10-L18`.
- **Type tokens map to Go types** as declared in code: `uuid` -> `uuid.UUID`, `string` -> `string`, `decimal` -> `decimal.Decimal`, `time` -> `time.Time`, and `JSONMap` -> `gorm.JSONMap` (a JSONB column). `Source: backend/internal/db/schema.go:L11-L68`.
- The diagram reflects the code **as-declared**, including the `"also embeds gorm.Model.ID (uint) - dual identifier"` annotation on `ORGANIZATION.ID`. That annotation applies to every entity and is explained in [Gap Notes](#gap-notes). `Source: backend/internal/db/schema.go:L11-L18`.

## Entity Field Reference

Each of the five entities is a GORM struct that embeds `gorm.Model` and then redeclares a UUID `ID` together with `CreatedAt`/`UpdatedAt`. The **(Source-present, non-buildable)** tag on each entity heading below denotes *declared-in-source* status — the struct is written in code — and not that it compiles or runs today; as noted above and in the [Gap Notes](#gap-notes), `schema.go` does not currently compile because `Metadata gorm.JSONMap` is an undefined type in `gorm.io/gorm` (Defect 4). The tables below reproduce every field exactly as declared — Go field name, Go type, key/constraint, and notes — with no invented fields. `Source: backend/internal/db/schema.go:L39,L53,L65`.

### Organization (Source-present, non-buildable)

`Source: backend/internal/db/schema.go:L11-L18`.

| Field | Go Type | Key/Constraint | Notes |
|-------|---------|----------------|-------|
| `gorm.Model` | embedded struct | — | Embedded base; contributes `ID uint`, `CreatedAt`, `UpdatedAt`, `DeletedAt`. Collides with the redeclared fields below (see [Gap Notes](#gap-notes)). |
| `ID` | `uuid.UUID` | PK (`gorm:"type:uuid;primary_key"`) | UUID primary key, redeclared alongside `gorm.Model.ID uint`. |
| `Name` | `string` | — | Organization display name. |
| `APIKey` | `string` | — | Per-organization API key used for programmatic access. |
| `CreatedAt` | `time.Time` | — | Redeclares `gorm.Model.CreatedAt`. |
| `UpdatedAt` | `time.Time` | — | Redeclares `gorm.Model.UpdatedAt`. |

### User (Source-present, non-buildable)

`Source: backend/internal/db/schema.go:L20-L30`.

| Field | Go Type | Key/Constraint | Notes |
|-------|---------|----------------|-------|
| `gorm.Model` | embedded struct | — | Embedded base (see [Gap Notes](#gap-notes)). |
| `ID` | `uuid.UUID` | PK | UUID primary key. |
| `OrganizationID` | `uuid.UUID` | FK -> Organization | Multi-tenancy scope; associates the user with its organization. |
| `Username` | `string` | — | Login username. |
| `Email` | `string` | — | Contact email. |
| `PasswordHash` | `string` | — | Hashed credential; plaintext passwords are never persisted. |
| `Role` | `string` | — | Role-based access-control role for the user. |
| `CreatedAt` | `time.Time` | — | Redeclares `gorm.Model.CreatedAt`. |
| `UpdatedAt` | `time.Time` | — | Redeclares `gorm.Model.UpdatedAt`. |

### Vault (Source-present, non-buildable)

`Source: backend/internal/db/schema.go:L32-L42`.

| Field | Go Type | Key/Constraint | Notes |
|-------|---------|----------------|-------|
| `gorm.Model` | embedded struct | — | Embedded base (see [Gap Notes](#gap-notes)). |
| `ID` | `uuid.UUID` | PK | UUID primary key. |
| `OrganizationID` | `uuid.UUID` | FK -> Organization | Multi-tenancy scope; the owning organization. |
| `Name` | `string` | — | Vault display name. |
| `BlockchainType` | `string` | — | Target chain for the vault (e.g. XRP Ledger, Ethereum Network). |
| `Address` | `string` | — | On-chain address held by the custodial vault. |
| `Metadata` | `gorm.JSONMap` | JSONB | Free-form JSON metadata associated with the vault. |
| `CreatedAt` | `time.Time` | — | Redeclares `gorm.Model.CreatedAt`. |
| `UpdatedAt` | `time.Time` | — | Redeclares `gorm.Model.UpdatedAt`. |

### Transaction (Source-present, non-buildable)

`Source: backend/internal/db/schema.go:L44-L56`.

| Field | Go Type | Key/Constraint | Notes |
|-------|---------|----------------|-------|
| `gorm.Model` | embedded struct | — | Embedded base (see [Gap Notes](#gap-notes)). |
| `ID` | `uuid.UUID` | PK | UUID primary key. |
| `UserID` | `uuid.UUID` | FK -> User | The user who initiated the transaction. |
| `VaultID` | `uuid.UUID` | FK -> Vault | The source vault the transaction draws from. |
| `Status` | `string` | — | Lifecycle status. Backend vocabulary is `Pending` / `Processed` (see [Gap Notes](#gap-notes)). |
| `BlockchainType` | `string` | — | Target chain for the transaction. |
| `TxHash` | `string` | — | On-chain transaction hash; populated after broadcast. |
| `Amount` | `decimal.Decimal` | — | Arbitrary-precision monetary amount (see [Notable Field Types](#notable-field-types)). |
| `Metadata` | `gorm.JSONMap` | JSONB | Free-form JSON metadata. |
| `CreatedAt` | `time.Time` | — | Redeclares `gorm.Model.CreatedAt`. |
| `UpdatedAt` | `time.Time` | — | Redeclares `gorm.Model.UpdatedAt`. |

### Signature (Source-present, non-buildable)

`Source: backend/internal/db/schema.go:L58-L68`.

| Field | Go Type | Key/Constraint | Notes |
|-------|---------|----------------|-------|
| `gorm.Model` | embedded struct | — | Embedded base (see [Gap Notes](#gap-notes)). |
| `ID` | `uuid.UUID` | PK | UUID primary key. |
| `UserID` | `uuid.UUID` | FK -> User | The user who requested the signature. |
| `VaultID` | `uuid.UUID` | FK -> Vault | The vault whose key produces the signature. |
| `Status` | `string` | — | Signature lifecycle status. |
| `RawSignature` | `string` | — | Raw custodian signature material (see [Notable Field Types](#notable-field-types)). |
| `Metadata` | `gorm.JSONMap` | JSONB | Free-form JSON metadata. |
| `CreatedAt` | `time.Time` | — | Redeclares `gorm.Model.CreatedAt`. |
| `UpdatedAt` | `time.Time` | — | Redeclares `gorm.Model.UpdatedAt`. |

### Notable Field Types

- **`Transaction.Amount` is `decimal.Decimal`.** Monetary amounts use arbitrary-precision decimals rather than floating-point, which avoids the rounding errors inherent to `float` types when representing currency. `Source: backend/internal/db/schema.go:L52`.
- **`Signature.RawSignature` is a `string`.** It holds the raw signature material returned by the custodian for the signing request. `Source: backend/internal/db/schema.go:L64`.
- **`Metadata` is declared as `gorm.JSONMap` (intended as a JSONB column) — but this type is undefined in `gorm.io/gorm`.** Vault, Transaction, and Signature each declare a `Metadata` field intended to persist free-form key/value attributes as JSONB without schema changes; however, `gorm.JSONMap` does not exist in `gorm.io/gorm`, so `schema.go` does not compile as-declared (Defect 4 in [`scaffold-vs-design.md`](scaffold-vs-design.md)). The JSONB behavior is therefore **Designed**, not functional today. `Source: backend/internal/db/schema.go:L39,L53,L65`.

## Relationships

The six relationships depicted in **Fig M1 — Data Model ERD** are all one-to-many, inferred from the UUID association fields (modeled as foreign keys) declared on the child entities. These associations are logical only: no database foreign-key constraint enforces them, because `schema.go` does not compile and the `db` package defines no migrations. `Source: backend/internal/db/schema.go:L20-L68`, `Source: backend/internal/db/postgres.go:L10-L18`.

- **Organization 1..\* User** — an organization *has* many users; each user carries an `OrganizationID`. `Source: backend/internal/db/schema.go:L23`.
- **Organization 1..\* Vault** — an organization *owns* many vaults; each vault carries an `OrganizationID`. `Source: backend/internal/db/schema.go:L35`.
- **User 1..\* Transaction** — a user *initiates* many transactions; each transaction carries a `UserID`. `Source: backend/internal/db/schema.go:L47`.
- **User 1..\* Signature** — a user *requests* many signatures; each signature carries a `UserID`. `Source: backend/internal/db/schema.go:L61`.
- **Vault 1..\* Transaction** — a vault *processes* many transactions; each transaction carries a `VaultID`. `Source: backend/internal/db/schema.go:L48`.
- **Vault 1..\* Signature** — a vault *generates* many signatures; each signature carries a `VaultID`. `Source: backend/internal/db/schema.go:L62`.

**Multi-tenancy.** The data model *represents* tenancy through UUID association fields — Users and Vaults carry an `OrganizationID`, while Transactions and Signatures carry both a `UserID` and a `VaultID`, logically tying every operational record back to the acting user and the vault it touches. `Source: backend/internal/db/schema.go:L20-L68`. However, nothing in the current code **enforces** that tenant isolation: (1) there are no database foreign-key constraints and no migrations, and `schema.go` does not compile, so the fields exist only as plain `uuid.UUID` columns with no referential integrity `Source: backend/internal/db/schema.go:L39,L53,L65`, `Source: backend/internal/db/postgres.go:L10-L18`; (2) the `db` package defines no `Repository` layer that would scope queries by `OrganizationID`, so no data-access path filters records by tenant `Source: backend/internal/db/postgres.go:L10-L18`; and (3) there is no authorization boundary in the request path that checks a caller's organization against the record being accessed (the `internal/api/middleware` package that would carry such a check is absent — see [`scaffold-vs-design.md`](scaffold-vs-design.md)). Tenant isolation is therefore **Designed** — the fields to support it are declared in source, but the constraints, repository scoping, and authorization checks that would make it an enforced guarantee do not exist today.

## Gap Notes

The following model-level gaps are **documented honestly and are not fixed** by this deliverable; they describe the current state of the code as-declared. Each is expanded in [`scaffold-vs-design.md`](scaffold-vs-design.md).

### Undefined `gorm.JSONMap` type — schema does not compile (source-present defect)

Every entity that carries a `Metadata` column declares it as `gorm.JSONMap`, but `gorm.JSONMap` is an **undefined type in `gorm.io/gorm`**. Because the type does not exist in the imported package, `schema.go` does not compile, and consequently none of the five entity structs can be built or exercised as-declared today. This is the compile-blocking defect catalogued as **Defect 4** in [`scaffold-vs-design.md`](scaffold-vs-design.md); the dual-identifier conflict below likewise cannot be exercised until it is resolved. `Source: backend/internal/db/schema.go:L39,L53,L65`.

### Dual-identifier inconsistency (source-present defect)

Every entity embeds `gorm.Model` — which itself provides `ID uint`, `CreatedAt`, `UpdatedAt`, and `DeletedAt` — **and** redeclares `ID uuid.UUID`, `CreatedAt time.Time`, and `UpdatedAt time.Time`. This creates conflicting primary-key semantics (`uint` versus `uuid`) and duplicate timestamp fields that GORM cannot map cleanly. `Source: backend/internal/db/schema.go:L11-L18` (Organization is representative; all five entities share the pattern).

```go
gorm.Model                                  // embeds ID uint, CreatedAt, UpdatedAt, DeletedAt
ID uuid.UUID `gorm:"type:uuid;primary_key"` // redeclares ID as uuid.UUID (conflicts)
```

### Status vocabulary mismatch (note)

The backend Transaction status vocabulary is `Pending` / `Processed`, set via the `db.TransactionStatusPending` and `db.TransactionStatusProcessed` constants. `Source: backend/internal/core/transaction/service.go:L46,L81`. The frontend Zod schema, however, validates a different vocabulary of `Pending` / `Completed` / `Failed`. `Source: frontend/src/schema/transaction.ts:L10`. This divergence is detailed in [`scaffold-vs-design.md`](scaffold-vs-design.md) and reflected in the endpoint documentation at [`../api-reference/transactions.md`](../api-reference/transactions.md).

### No migrations / mixed persistence (Provisioned)

The `db` package initializes a `sqlx` connection and defines no GORM `AutoMigrate` and no `Repository`, so these GORM structs are not yet bound to a live physical schema. `Source: backend/internal/db/postgres.go:L10-L18`. The logical entity model above is therefore **source-present (non-buildable)** at the struct level, while the **physical schema is Designed/Provisioned** until migration wiring is added.

## Design vs. Code

The design entity-relationship model in the Technical Specification models the same six relationships as **Fig M1 — Data Model ERD**, but with clean single `uuid id PK` columns and snake_case column names (for example `api_key`, `organization_id`, `tx_hash`, `raw_signature`, `created_at`, `updated_at`), using `timestamp` for time columns, `jsonb` for metadata, and `text` for the raw signature. `Source: documentation/Technical Specifications.md:§DATABASE DESIGN`. Notably, the design does **not** carry the dual-identifier gap; it is the intended target that the current scaffold has yet to reach.

## Referenced By

**Fig M1 — Data Model ERD** is the shared entity-relationship diagram and the single source of truth for entity definitions across the API reference. The following pages link back to this document (anchor `#fig-m1--data-model-erd`) for entity structure rather than redefining fields:

- [`../api-reference/vaults.md`](../api-reference/vaults.md) — Vault resource.
- [`../api-reference/transactions.md`](../api-reference/transactions.md) — Transaction resource.
- [`../api-reference/signatures.md`](../api-reference/signatures.md) — Signature resource.
