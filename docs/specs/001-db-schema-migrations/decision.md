# Decision Record: Database Schema + Migrations

| Field | Value |
|---|---|
| id | 001 |
| status | implemented |
| created | 2026-06-13 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

This is the first implemented feature of MH Ventanas. The repo was greenfield — only `docs/`
plus README/.gitignore — so implementing the schema also meant bootstrapping the project's
toolchain. Per a confirmed decision during planning, that bootstrap was kept **minimal and
DB-only**: no TanStack Start app yet (that is feature 004). The goal was a self-contained
`src/db/` package that 004 can later wrap an app around without moving anything.

Two facts shaped the work beyond the spec:

- **A local Postgres already owned port 5432.** The dev machine runs Homebrew `postgresql@17`
  bound to `127.0.0.1:5432` and `[::1]:5432`. Docker's compose service binds the wildcard
  `*:5432`, and on macOS `localhost` resolves to the loopback addresses first — so host
  connections silently hit the local server (which has no `mhventanas` role) instead of the
  container. This surfaced as a `FATAL: role "mhventanas" does not exist` on the first migrate.
- **Drizzle 0.45 wraps query errors.** DB errors raised through the Drizzle client are
  `DrizzleQueryError` with the original `PostgresError` nested under `.cause` — the SQLSTATE code
  is at `error.cause.code`, not the top level. The constraint tests had to assert accordingly.

## Decision <!-- required -->

Built the schema as Drizzle schema-as-code (`src/db/schema.ts`): a `weapon_type` Postgres enum
plus `monsters`, `punish_guides`, and `clips` tables with `bigint` generated-always identity PKs,
named composite unique constraints, and cascading foreign keys (nullable `clips.punish_guide_id`).
Migrations are generated as committed SQL via `drizzle-kit generate` and applied by a small,
importable `drizzle-orm` migrator (`src/db/migrate.ts`) — not `drizzle-kit push`/`migrate`. A thin
shared client (`src/db/client.ts`) reads `DATABASE_URL` and exports `db`/`sql`/`schema` for
features 002 and 004 to import; it ships no business query helpers. Local Postgres 17 runs via
docker-compose with a separate `mhventanas_test` database for the Vitest suite. The dockerized DB
publishes on host port **5433** to avoid the local-Postgres collision.

---

## Alternatives Considered <!-- required -->

### ORM / migration tooling

**Option A — Drizzle:** TypeScript-first schema-as-code, generates reviewable SQL migrations,
lightweight typed client.
- Pros: one source of truth for schema + types; serverless-friendly; minimal runtime.
- Cons: smaller ecosystem than Prisma; `drizzle-kit` and `drizzle-orm` version independently.

**Option B — Prisma:** mature DX, studio, schema DSL + generated client.
- Pros: ergonomics, tooling.
- Cons: separate engine binary, heavier cold starts, schema lives outside TS.

**Option C — Kysely / raw SQL + migration runner:** maximum control, closest to SQL.
- Pros: transparency.
- Cons: more manual wiring, hand-rolled types.

**Chosen:** Drizzle — decided in the spec, confirmed in planning. Fits TS + Postgres + future
Nitro and keeps schema and types unified.

### Migration apply mechanism

**Option A — `drizzle-kit migrate` (CLI):** apply via the kit binary.
- Pros: zero extra code.
- Cons: CLI-only; re-parses config separately; not reusable programmatically.

**Option B — `drizzle-orm` migrator script (`migrate.ts`):** small importable runner.
- Pros: same code path 002/004/deploy can call; shares one driver config; the Vitest
  `globalSetup` imports it directly instead of shelling out.
- Cons: a few lines of our own code to maintain.

**Chosen:** Option B. The reuse (tests import `runMigrations`) and single connection config
outweighed the trivial maintenance. `drizzle-kit push` was explicitly rejected — the spec wants
committed, reviewable migration files and journal-tracked idempotency.

### ID type / `bigint` marshaling

**Option A — `mode: "number"`:** Drizzle returns JS numbers.
- Pros: ergonomic; no `BigInt` plumbing.
- Cons: precision ceiling at 2^53 (a non-issue at this app's row scale).

**Option B — `mode: "bigint"`:** returns `BigInt`.
- Pros: correct for huge IDs.
- Cons: friction everywhere IDs are used.

**Chosen:** Option A — deliberate trade-off for a small content site; IDs are not user-facing
(slugs are).

### Test database isolation

**Option A — separate `mhventanas_test` DB (compose init script):** tests run against their own DB.
- Pros: never touches dev data; clean.
- Cons: needs the DB created (handled by `db/initdb.d/01-create-test-db.sql`).

**Option B — truncate the dev DB between tests:** single DB.
- Pros: zero setup.
- Cons: clobbers dev data; risky.

**Chosen:** Option A, with `beforeEach` `TRUNCATE ... RESTART IDENTITY CASCADE` for per-test
isolation and `fileParallelism: false` since files share one DB.

### Docker host port (discovered during implementation)

**Option A — keep 5432, stop the user's local Postgres.**
- Pros: conventional port.
- Cons: intrusive to the dev's environment; not the project's call.

**Option B — publish the container on 5433.**
- Pros: no collision; leaves local Postgres untouched; reproducible.
- Cons: non-default port to remember (documented in `.env.example` + README).

**Chosen:** Option B.

---

## Tradeoffs <!-- required -->

- **Optimised for:** a focused, independently verifiable foundation. The DB layer stands alone,
  is fully tested, and imposes no app-framework decisions on 004.
- **Given up:** Drizzle's smaller ecosystem vs Prisma; `mode: "number"` gives up large-ID
  precision; no query helpers means 002/004 write their own access patterns (intentional — avoids
  prejudging their needs); the 5433 port is a small "gotcha" contributors must internalize.
- **Accepted constraint:** `updated_at` has `DEFAULT now()` only and does not auto-bump on update;
  the on-update strategy is deferred to 002, which owns writes.

---

### Spec Divergence <!-- optional -->

The implementation matched the spec's schema, scope, and acceptance criteria. The only deviations
are environmental/mechanical, not semantic:

| Spec Said | What Was Built | Reason |
|---|---|---|
| Connect to local Postgres (port unspecified, examples implied 5432) | docker-compose publishes host port **5433**; env URLs use 5433 | Local Homebrew Postgres already owns 5432 and wins the macOS `localhost` race against Docker's wildcard bind |
| Tests assert Postgres SQLSTATE codes | Assert on `error.cause.code` (not top-level `code`) | Drizzle 0.45 wraps DB errors in `DrizzleQueryError` with the `PostgresError` under `.cause` |

No divergence in tables, columns, enum, constraints, cascade behavior, client contract, or
migration workflow.

---

## Spec Gaps Exposed <!-- optional -->

- **Port not pinned.** The spec/architecture examples used 5432 without accounting for a local
  Postgres. Minor; resolved by 5433 + docs. Worth a one-line note in ARCHITECTURE if other
  contributors join.
- **`updated_at` auto-update unspecified.** The spec mandates `DEFAULT now()` but is silent on
  bumping `updated_at` on update. Flagged in the plan and deferred to **002** (writes owner) —
  candidate for an explicit decision there (`$onUpdate` vs DB trigger).
- **Error-shape assumption.** The spec's "assert SQLSTATE codes" implicitly assumed the code is on
  the thrown error directly; Drizzle's wrapping means future query-error tests in 002/004 should
  also reach through `.cause`.

---

## Test Evidence <!-- required -->

Typecheck (`pnpm typecheck` → `tsc --noEmit`) exits 0. Migration applies and re-runs as a no-op
(`pnpm db:migrate` → "Migrations applied.", journal holds a single entry). Full Vitest suite
(`pnpm exec vitest run --reporter=verbose`):

```
 ✓ test/schema.test.ts > monsters > rejects a duplicate (game, slug) 49ms
 ✓ test/schema.test.ts > monsters > allows the same slug in a different game 10ms
 ✓ test/schema.test.ts > punish_guides > rejects a second guide for the same (monster, weapon) 14ms
 ✓ test/schema.test.ts > punish_guides > allows both weapon types for one monster 11ms
 ✓ test/schema.test.ts > punish_guides > rejects a weapon_type outside the enum 8ms
 ✓ test/schema.test.ts > clips > rejects a duplicate (monster, slug) 9ms
 ✓ test/schema.test.ts > cascade delete > removes a monster's punish_guides and clips 14ms
 ✓ test/client.test.ts > db client > connects and runs a trivial query 30ms
 Test Files  2 passed (2)
      Tests  8 passed (8)
```

Schema verified directly via `psql \d punish_guides`: `bigint` identity PK, `weapon_type` enum
column, `UNIQUE (monster_id, weapon_type)`, FK to `monsters` `ON DELETE CASCADE`, and referenced-by
`clips` with cascade.
