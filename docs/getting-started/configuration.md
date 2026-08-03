# Configuration

This page is the canonical environment-variable and connection-configuration reference for the Blockchain Integration Service and Dashboard. It catalogs every value the backend composition root and the database/cache layers consume, shows how the PostgreSQL connection string (DSN) is constructed, documents Redis and the single frontend build-time variable, and closes the missing `.env.example` gap with an illustrative example block. Prerequisites and install tracks are covered in [installation.md](./installation.md); the day-to-day developer workflow and build caveats are covered in [local-development.md](./local-development.md).

> **Important — the backend configuration surface is a Designed contract.** The composition root loads its settings through a `backend/internal/config` package, and the database and cache layers read a `config.GetConfig()` struct from that same package. `Source: backend/cmd/server/main.go:L6,L22`, `Source: backend/internal/db/postgres.go:L7`, `Source: backend/internal/db/redis.go:L6`. That package **is imported but does not exist in the repository**, so every backend setting documented below is the intended contract **inferred from its consuming code** rather than working configuration wiring. The database DSN construction (`internal/db/postgres.go`) and the Redis client (`internal/db/redis.go`) are themselves **Source-present (non-buildable)** — the initializer code is written out, but because the imported `internal/config` package is absent and there is no `go.mod`, the backend does not compile and none of this initialization can be observed to run.

## Maturity Legend

Every capability on this page is tagged with the project-wide maturity discipline used across the documentation set:

- **Implemented** — present in the repository AND compiles AND runs today; reserved, and nothing here qualifies at this checkpoint (the backend has no `go.mod` and imports absent packages).
- **Source-present (non-buildable)** — code exists but does not compile today, so no runtime behavior may be asserted.
- **Provisioned** — configuration or container definition exists and would validly apply, but is not yet wired to run.
- **Designed** — specified or inferred from consuming code, but absent from the code today.

This vocabulary is identical to the reconciliation page's [Maturity Legend](../architecture/scaffold-vs-design.md#maturity-legend).

## Backend Environment Variables

The composition root loads configuration once at startup via `config.LoadConfig()` and then passes typed fields into each subsystem initializer. `Source: backend/cmd/server/main.go:L22`. The table below catalogs each value the composition root and database/cache layers consume. Because `backend/internal/config` is absent, the concrete environment-variable binding names are not defined in code; the field names shown are the struct fields the consuming code actually reads.

| Setting | Purpose | Consumed by (Source) | Maturity |
|---------|---------|----------------------|----------|
| `LogLevel` | Log verbosity passed to the logger initializer at startup | `logger.Init(cfg.LogLevel)` — backend/cmd/server/main.go:L28 | Designed |
| `ServerAddress` | Bind address/port the HTTP router listens on | `router.Run(cfg.ServerAddress)` — backend/cmd/server/main.go:L59-L60 | Designed |
| `DatabaseURL` | Single database connection URL loaded by the composition root | `db.InitDB(cfg.DatabaseURL)` — backend/cmd/server/main.go:L31 | Designed |
| `DBHost`, `DBPort`, `DBUser`, `DBPassword`, `DBName` | Discrete fields used to build the PostgreSQL DSN | `connStr` in `InitDB` — backend/internal/db/postgres.go:L15 | Source-present (non-buildable) DSN build; values Designed |
| `DBMaxOpenConns`, `DBMaxIdleConns`, `DBConnMaxLifetime` | Connection-pool tuning coded to be applied after connect | backend/internal/db/postgres.go:L23-L25 | Source-present (non-buildable); values Designed |
| `Redis.Address`, `Redis.Password`, `Redis.DB` | Redis endpoint, auth password, and logical DB index | `redis.NewClient(&redis.Options{...})` — backend/internal/db/redis.go:L14-L18 | Source-present (non-buildable) client; values Designed |
| `BlockchainConfigs` | XRP Ledger / Ethereum client configuration | `blockchain.InitBlockchainClients(cfg.BlockchainConfigs)` — backend/cmd/server/main.go:L38 | Designed (package absent) |
| `CustodianConfig` | Utxo Custodian client configuration | `custodian.InitCustodianClient(cfg.CustodianConfig)` — backend/cmd/server/main.go:L44 | Designed (package absent) |

**Server port is not hard-coded.** The HTTP server binds whatever `cfg.ServerAddress` resolves to. `Source: backend/cmd/server/main.go:L59-L60`. The only concrete port in the repository is the backend Docker image's `EXPOSE 8080`, which is a container convention rather than a value read from code. `Source: infrastructure/docker/Dockerfile.backend:L20`.

**Note — a config-shape inconsistency (Designed).** The composition root passes a single connection URL, `db.InitDB(cfg.DatabaseURL)`. `Source: backend/cmd/server/main.go:L31`. The database layer, however, defines `InitDB()` with **no parameters** and builds its DSN from five discrete fields (`DBHost`, `DBPort`, `DBUser`, `DBPassword`, `DBName`). `Source: backend/internal/db/postgres.go:L12-L18`. The two sides therefore disagree on the config shape — a single URL versus discrete fields — so this contract is **Designed** and must be reconciled before the backend can be wired end-to-end.

## Database (PostgreSQL) Configuration

The PostgreSQL DSN is assembled from the discrete `DB*` fields and appends a fixed `sslmode=disable`. `Source: backend/internal/db/postgres.go:L15`. The resulting connection string has the following structure:

```text
host=<DBHost> port=<DBPort> user=<DBUser> password=<DBPassword> dbname=<DBName> sslmode=disable
```

The initializer is coded to open the connection with `sqlx.Connect("postgres", connStr)` using the `lib/pq` driver and then to verify it with a ping. `Source: backend/internal/db/postgres.go:L4-L6,L18`. Because the package does not compile today (absent `internal/config`, no `go.mod`), this connect-and-ping sequence is source-present (non-buildable) and cannot be observed to run. The following fields drive the DSN and connection pool.

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

### DSN Quoting and Escaping (libpq keyword/value form)

The DSN is built by **raw string concatenation with no quoting and no escaping** of any interpolated value:

```go
connStr := "host=" + cfg.DBHost + " port=" + cfg.DBPort + " user=" + cfg.DBUser + " password=" + cfg.DBPassword + " ..."
```

`Source: backend/internal/db/postgres.go:L15`. The string produced is the PostgreSQL **keyword/value** connection-string form, in which values are whitespace-delimited and two characters are escape-significant. `Source: PostgreSQL 15 documentation, "Connection Strings" — postgresql.org/docs/15/libpq-connect.html#LIBPQ-CONNSTRING`. Because L15 inserts `cfg.DBPassword` verbatim, any password containing whitespace, a single quote, or a backslash changes how the **whole** DSN parses. The rules below therefore constrain what a `DB_PASSWORD` value may contain, not merely how it is typed.

**A space terminates a value — it does not need to be the last character to break parsing.** With a password of `Space Pass#1`, the concatenated DSN becomes `... password=Space Pass#1 dbname=postgres ...`, and the parser reads `Space` as the password, then tries to read `Pass#1` as the next *keyword*:

```text
missing "=" after "Pass#1" in connection info string
```

Two forms parse correctly — single-quoting the value, or backslash-escaping each space:

```text
password='Space Pass#1'
password=Space\ Pass#1
```

**`#` is not a comment or metacharacter in a DSN.** A password of `Ha#sh` connects with no quoting at all in both the keyword/value and URI forms. When a `#` password fails, the cause is an adjacent space or quote, never the `#` itself — a distinction worth checking before rewriting a working credential.

**Inside single quotes, `'` and `\` must each be escaped with a backslash.** For a password of `it's\hard`, only the fully escaped forms authenticate:

| DSN fragment | Result |
|--------------|--------|
| `password='it\'s\\hard'` | connects — both metacharacters escaped |
| `password=it\'s\\hard` | connects — escaping works unquoted too |
| `password='it\'s\hard'` | **authentication failure** — `\h` collapses to `h`, sending `it'shard` |
| `password=it's\hard` | **authentication failure** — same collapse, unquoted |

**The backslash failure mode is silent, and that is the dangerous one.** An unescaped backslash is consumed as an escape character rather than rejected, so the parser succeeds and the driver sends a *different* password than intended. The server answers `password authentication failed for user "…"`, which reads as a wrong-credential problem and sends operators to reset a password that was in fact correct. A space produces a loud parse error; a backslash produces a misleading authentication error.

**A quoted-empty password means "not supplied", not "empty".** `password=''` does not send an empty password — libpq falls back to its normal password sources and prompts interactively:

```text
Password for user spaceuser:
```

A backend process with no controlling terminal cannot answer that prompt, so this manifests as a startup hang or an immediate authentication failure rather than as an obvious configuration error.

**An empty value swallows the next keyword.** Whitespace after `=` is skipped before the value is read, so an unset variable does not yield an empty field — it consumes the following key text. With `DBHost` empty, `host= port=5432 …` parses the host as the literal string `port=5432`:

```text
could not translate host name "port=5432" to address: Name or service not known
```

A DNS-resolution error naming another key is the signature of an unset `DB_*` variable upstream, not of a network problem.

**URI form as a safer alternative.** The same driver accepts a `postgres://` URI, where percent-encoding is the single uniform escaping mechanism and no character is whitespace-delimited. This matches the `DATABASE_URL` shape the composition root already passes. `Source: backend/cmd/server/main.go:L31`. Unlike the keyword/value form, the URI form rejects raw spaces explicitly rather than mis-parsing them:

```text
unexpected spaces found in "Space Pass#1", use percent-encoded spaces (%20) instead
```

Encode reserved characters in the userinfo segment — space `%20`, `#` `%23`, `'` `%27`, `\` `%5C`, `@` `%40`, `:` `%3A`, `/` `%2F`, `?` `%3F`, and `%` itself `%25`:

```text
postgres://spaceuser:Space%20Pass%231@localhost:5432/postgres?sslmode=disable
```

**Character handling summary.** The two forms disagree on which characters need attention, which is the main reason to prefer one form consistently:

| Character in password | Keyword/value form | URI form |
|-----------------------|--------------------|----------|
| space | quote the value or escape as `\ ` — otherwise a parse error | must be `%20` — raw space is rejected with a clear message |
| `\` | must be doubled (`\\`) — otherwise **silent** credential corruption | literal, or `%5C` |
| `'` | must be escaped (`\'`) | literal, or `%27` |
| `#` | literal — no handling required | literal, or `%23` |
| `@`, `:`, `/`, `?` | literal — no handling required | percent-encode (they delimit URI components) |
| `%` | literal — no handling required | **must** be `%25` — a bare `%` is a hard parse error |
| empty / unset | consumes the next keyword as its value | yields an empty component |

A password of `a@b:c/d?e%f` illustrates the asymmetry: it connects **unmodified** in the keyword/value form, both bare and quoted, because none of those characters is whitespace- or escape-significant there. In the URI form the same password must be written `a%40b%3Ac%2Fd%3Fe%25f`; leaving the `%` raw fails before any network round trip:

```text
invalid percent-encoded token: "a%40b%3Ac%2Fd%3Fe%f"
```

This is the one respect in which the keyword/value form is the more forgiving of the two, and it is why the choice of form should be made once per environment rather than per credential.

**Operator guidance for this codebase (documented defect, not a code change).** Because L15 applies no quoting, the escaping above must be present in the *stored value* of `DB_PASSWORD` for the concatenated DSN to parse — which makes the stored secret differ from the real password and is error-prone. Until the DSN build quotes its inputs, the reliable options are to restrict database passwords to unreserved characters (letters, digits, `-`, `_`, `.`, `~`), or to supply a fully percent-encoded `DATABASE_URL` and connect through that instead of the five discrete fields. Quoting the interpolated values at L15 is the correct **Designed** correction; it is recorded here as a defect rather than applied, consistent with this documentation set's scope. The related config-shape inconsistency between `DatabaseURL` and the discrete `DB*` fields is described in the note above, and the full defect inventory is in [scaffold-vs-design.md](../architecture/scaffold-vs-design.md).

**How these behaviors were verified.** The backend does not compile (absent `internal/config`, no `go.mod`), so none of the above could be observed through this codebase. Each behavior was instead reproduced against **PostgreSQL 15** with `scram-sha-256` authentication in force, using the reference libpq client, with a deliberately wrong-password control run confirming that the server was genuinely authenticating rather than trusting the connection. `lib/pq` — the driver this DSN is built for, `Source: backend/internal/db/postgres.go:L5` — implements the same keyword/value grammar, including single-quoted values and backslash escapes. Treat the DSN-parsing rules as **verified against the reference implementation** and the codebase's own behavior as **Source-present (non-buildable)**.

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

The single frontend variable is `REACT_APP_API_BASE_URL`, which points the Axios client at the backend, falling back to `https://api.example.com` when unset. `Source: frontend/src/services/api.ts:L4`. It is a Create React App **build-time** variable — Create React App only inlines custom environment variables whose names begin with the `REACT_APP_` prefix into the built bundle, and it does so at build time rather than at runtime (`Source: Create React App docs, "Adding Custom Environment Variables" — create-react-app.dev/docs/adding-custom-environment-variables`) — and it typically lives in `frontend/.env`. (Create React App is deprecated as of 2025-02-14; see [local-development.md](./local-development.md) for the primary-source note and migration status.)

```env
REACT_APP_API_BASE_URL=http://localhost:8080
```

## Cross References and Next Steps

- [installation.md](./installation.md) — prerequisites and the backend/frontend install tracks.
- [local-development.md](./local-development.md) — developer workflow and build caveats (no `go.mod`, no lockfile).
- [security-model.md](../security/security-model.md) — JWT, RBAC, MFA, and encryption (at rest and in transit).
- [index.md](../index.md) — documentation home and full navigation.
