# Configuration

This page is the canonical environment-variable and connection-configuration reference for the Blockchain Integration Service and Dashboard. It catalogs every value the backend composition root and the database/cache layers consume, shows how the PostgreSQL connection string (DSN) is constructed, documents Redis and the single frontend build-time variable, and closes the missing `.env.example` gap with an illustrative example block. Prerequisites and install tracks are covered in [installation.md](./installation.md); the day-to-day developer workflow and build caveats are covered in [local-development.md](./local-development.md).

> **Important — the backend configuration surface is a Designed contract.** The composition root loads its settings through a `backend/internal/config` package, and the database and cache layers read a `config.GetConfig()` struct from that same package. `Source: backend/cmd/server/main.go:L6,L22`, `Source: backend/internal/db/postgres.go:L7`, `Source: backend/internal/db/redis.go:L6`. That package **is imported but does not exist in the repository**, so every backend setting documented below is the intended contract **inferred from its consuming code** rather than working configuration wiring. The database DSN construction (`internal/db/postgres.go`) and the Redis client (`internal/db/redis.go`) are themselves **Implemented**, but they depend on the absent config package for their values.

## Maturity Legend

Every capability on this page is tagged with the project-wide maturity discipline used across the documentation set:

- **Implemented** — present and working in the code today.
- **Provisioned** — infrastructure or container configuration exists, but the capability is not yet fully wired to run.
- **Designed** — specified or inferred from consuming code, but absent from the code today.

## Backend Environment Variables

The composition root loads configuration once at startup via `config.LoadConfig()` and then passes typed fields into each subsystem initializer. `Source: backend/cmd/server/main.go:L22`. The table below catalogs each value the composition root and database/cache layers consume. Because `backend/internal/config` is absent, the concrete environment-variable binding names are not defined in code; the field names shown are the struct fields the consuming code actually reads.

| Setting | Purpose | Consumed by (Source) | Maturity |
|---------|---------|----------------------|----------|
| `LogLevel` | Log verbosity passed to the logger initializer at startup | `logger.Init(cfg.LogLevel)` — backend/cmd/server/main.go:L28 | Designed |
| `ServerAddress` | Bind address/port the HTTP router listens on | `router.Run(cfg.ServerAddress)` — backend/cmd/server/main.go:L59-L60 | Designed |
| `DatabaseURL` | Single database connection URL loaded by the composition root | `db.InitDB(cfg.DatabaseURL)` — backend/cmd/server/main.go:L31 | Designed |
| `DBHost`, `DBPort`, `DBUser`, `DBPassword`, `DBName` | Discrete fields used to build the PostgreSQL DSN | `connStr` in `InitDB` — backend/internal/db/postgres.go:L15 | Implemented (DSN build); values Designed |
| `DBMaxOpenConns`, `DBMaxIdleConns`, `DBConnMaxLifetime` | Connection-pool tuning applied after connect | backend/internal/db/postgres.go:L23-L25 | Implemented (applied); values Designed |
| `Redis.Address`, `Redis.Password`, `Redis.DB` | Redis endpoint, auth password, and logical DB index | `redis.NewClient(&redis.Options{...})` — backend/internal/db/redis.go:L14-L18 | Implemented (client); values Designed |
| `BlockchainConfigs` | XRP Ledger / Ethereum client configuration | `blockchain.InitBlockchainClients(cfg.BlockchainConfigs)` — backend/cmd/server/main.go:L38 | Designed (package absent) |
| `CustodianConfig` | Utxo Custodian client configuration | `custodian.InitCustodianClient(cfg.CustodianConfig)` — backend/cmd/server/main.go:L44 | Designed (package absent) |

**Server port is not hard-coded.** The HTTP server binds whatever `cfg.ServerAddress` resolves to. `Source: backend/cmd/server/main.go:L59-L60`. The only concrete port in the repository is the backend Docker image's `EXPOSE 8080`, which is a container convention rather than a value read from code. `Source: infrastructure/docker/Dockerfile.backend:L20`.

**Note — a config-shape inconsistency (Designed).** The composition root passes a single connection URL, `db.InitDB(cfg.DatabaseURL)`. `Source: backend/cmd/server/main.go:L31`. The database layer, however, defines `InitDB()` with **no parameters** and builds its DSN from five discrete fields (`DBHost`, `DBPort`, `DBUser`, `DBPassword`, `DBName`). `Source: backend/internal/db/postgres.go:L12-L18`. The two sides therefore disagree on the config shape — a single URL versus discrete fields — so this contract is **Designed** and must be reconciled before the backend can be wired end-to-end.

## Database (PostgreSQL) Configuration

The PostgreSQL DSN is assembled from the discrete `DB*` fields and appends a fixed `sslmode=disable`. `Source: backend/internal/db/postgres.go:L15`. The resulting connection string has the following structure:

```text
host=<DBHost> port=<DBPort> user=<DBUser> password=<DBPassword> dbname=<DBName> sslmode=disable
```

The connection is opened with `sqlx.Connect("postgres", connStr)` using the `lib/pq` driver, then verified with a ping. `Source: backend/internal/db/postgres.go:L4-L6,L18`. The following fields drive the DSN and connection pool.

| Field | Purpose | Source |
|-------|---------|--------|
| `DBHost` | PostgreSQL server host | backend/internal/db/postgres.go:L15 |
| `DBPort` | PostgreSQL server port | backend/internal/db/postgres.go:L15 |
| `DBUser` | Database user (role) | backend/internal/db/postgres.go:L15 |
| `DBPassword` | Database user password | backend/internal/db/postgres.go:L15 |
| `DBName` | Target database name | backend/internal/db/postgres.go:L15 |
| `DBMaxOpenConns` | Maximum open pooled connections (`SetMaxOpenConns`) | backend/internal/db/postgres.go:L23 |
| `DBMaxIdleConns` | Maximum idle pooled connections (`SetMaxIdleConns`) | backend/internal/db/postgres.go:L24 |
| `DBConnMaxLifetime` | Maximum lifetime of a pooled connection (`SetConnMaxLifetime`) | backend/internal/db/postgres.go:L25 |

**Security note — `sslmode`.** The DSN hard-codes `sslmode=disable`. `Source: backend/internal/db/postgres.go:L15`. This is acceptable for local development, but it transmits credentials and data without TLS, so a stricter mode such as `require` or `verify-full` is appropriate for any non-local environment. The platform's encryption-in-transit posture is described in the [security model](../security/security-model.md).

## Redis Configuration

Redis is used as the cache and async status store. The client is created with the `go-redis/v8` driver. `Source: backend/internal/db/redis.go:L5`. Its options are read from a nested `Redis` struct on the config. `Source: backend/internal/db/redis.go:L14-L18`.

| Setting | Purpose | Source |
|---------|---------|--------|
| `Redis.Address` | Redis `host:port` endpoint (`Addr`) | backend/internal/db/redis.go:L15 |
| `Redis.Password` | Redis auth password (empty string when unset) | backend/internal/db/redis.go:L16 |
| `Redis.DB` | Numeric logical database index (`DB`) | backend/internal/db/redis.go:L17 |

## JWT and Authentication Settings

Authentication uses JWT bearer tokens; the frontend attaches an `Authorization: Bearer <token>` header to each API request. `Source: frontend/src/services/api.ts:L14`. A token signing secret and a token expiry are therefore required configuration for the auth flow. These keys are **Designed** — their concrete definitions live in the absent `backend/internal/config` package. `Source: backend/cmd/server/main.go:L6,L22`. To avoid duplication, the token model, roles, and expiry policy are documented in the [security model](../security/security-model.md) and the [authentication API reference](../api-reference/authentication.md) rather than here.

## Example Environment Configuration

No `.env.example` file exists in the repository, yet `scripts/setup.sh` copies it during bootstrap (`cp .env.example .env`), so that step fails as written. `Source: scripts/setup.sh:L9`. This gap is **Designed/absent**. The illustrative block below documents the intended keys so a reader can adapt them; the binding names are illustrative because the authoritative config package is absent, and all secret values are obvious placeholders to be replaced.

```env
LOG_LEVEL=info
SERVER_ADDRESS=:8080
DATABASE_URL=postgres://app:change-me@localhost:5432/blockchain_integration?sslmode=disable
DB_HOST=localhost
DB_PORT=5432
DB_USER=app
DB_PASSWORD=change-me
DB_NAME=blockchain_integration
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
REDIS_ADDRESS=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0
JWT_SECRET=replace-with-strong-random-secret
JWT_EXPIRY=15m
```

The `BlockchainConfigs` and `CustodianConfig` values (see the backend table above) are structured rather than flat scalars and are **Designed**; they are not expressed in the flat block above.

The single frontend variable is `REACT_APP_API_BASE_URL`, which points the Axios client at the backend, falling back to `https://api.example.com` when unset. `Source: frontend/src/services/api.ts:L4`. It is a Create React App **build-time** variable — the `REACT_APP_` prefix is required for CRA to expose it to the bundle — and it typically lives in `frontend/.env`.

```env
REACT_APP_API_BASE_URL=http://localhost:8080
```

## Cross References and Next Steps

- [installation.md](./installation.md) — prerequisites and the backend/frontend install tracks.
- [local-development.md](./local-development.md) — developer workflow and build caveats (no `go.mod`, no lockfile).
- [security-model.md](../security/security-model.md) — JWT, RBAC, MFA, and encryption (at rest and in transit).
- [index.md](../index.md) — documentation home and full navigation.
