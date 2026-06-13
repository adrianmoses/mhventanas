# Spec: Database Schema + Migrations

| Field | Value |
|---|---|
| id | 001 |
| status | approved |
| created | 2026-06-13 |

---

## Why <!-- required -->

PostgreSQL is the read store for all guide content (ARCHITECTURE: "Git is the source of truth;
Postgres is the read store"). Nothing in the product renders until the schema exists: the ingest
pipeline has nowhere to write, and the route loaders have nothing to read. This feature
establishes the tables, constraints, and a shared database client that every downstream feature
builds on.

### Consumer Impact <!-- required -->

The direct consumers are internal systems, not the end hunter:

- **Ingest pipeline (002)** — writes compiled MDX and clip metadata via the shared DB client,
  upserting into `monsters`, `punish_guides`, and `clips`. Relies on the uniqueness constraints
  (upsert by slug, not blind insert — per the "ingest must be idempotent" constraint).
- **Route loaders (004)** — read guide content by slug for SSR, filtering on `published_at` for
  visibility.

The end hunter benefits only transitively: a correct schema is what lets published guides render
and unpublished drafts stay hidden.

### Roadmap Fit <!-- required -->

First item in the v1 sequence. It blocks 002 (ingest), 004 (routing/loaders), and therefore all
content features (005–007) and polish (008). It has no upstream dependencies — it is the
foundation, which is why it is sequenced first.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] A migration creates the `monsters`, `punish_guides`, and `clips` tables matching the schema
      in **Key Decisions** below.
- [ ] `weapon_type` is a Postgres enum constrained to `{longsword, greatsword}`.
- [ ] Uniqueness constraints exist: `monsters (game, slug)`, `punish_guides (monster_id,
      weapon_type)`, `clips (monster_id, slug)`.
- [ ] Foreign keys cascade on delete: `punish_guides.monster_id → monsters`,
      `clips.monster_id → monsters`, `clips.punish_guide_id → punish_guides` (nullable).
- [ ] Running the migration against an empty database succeeds; running it again is a no-op (no
      duplicate-object errors).
- [ ] Drizzle schema definitions exist in TypeScript and are the source the migration is generated
      from; generated types are importable by other features.
- [ ] A shared DB client module exports a configured connection that 002 and 004 can import,
      reading connection config from an environment variable.
- [ ] A documented way to run migrations (npm script) is present and works against a local
      Postgres.

### Non-Goals <!-- required -->

- No content or seed data — populating rows is the ingest pipeline's job (002).
- No business query helpers (get-monster-by-slug, etc.) — those land with their consumers
  (002/004). 001 ships only the connection/client, not the queries on top of it.
- No clip upload or CDN wiring — that is 003. `clips.url` is just a text column here.
- No migration automation in CI/CD or deploy — only the local/manual runner.
- No admin/auth or draft-management UI — `published_at` gating is enforced by loaders later.

### Open Questions <!-- optional -->

None. ID type (`bigint` identity), `overview_content` nullability, and `published_at` semantics
(visibility gating) were resolved in dialogue.

---

## How <!-- required -->

### Approach <!-- required -->

Use **Drizzle** as schema-as-code: define the three tables and the `weapon_type` enum in
TypeScript, then generate SQL migrations with `drizzle-kit`. A thin DB client module instantiates
the Postgres connection (driver config read from `DATABASE_URL`) and exports it plus the schema
for downstream import. Other features import the typed schema and client; they add their own
queries.

Data model (from ARCHITECTURE, with the resolved details):

```
monsters
  id               bigint  PK, generated always as identity
  slug             text    NOT NULL
  name             text    NOT NULL
  variant          text    NULL
  game             text    NOT NULL
  overview_content text    NULL          -- compiled general-page MDX, filled by 002
  created_at       timestamptz NOT NULL DEFAULT now()
  updated_at       timestamptz NOT NULL DEFAULT now()
  UNIQUE (game, slug)

punish_guides
  id               bigint  PK, generated always as identity
  monster_id       bigint  NOT NULL  FK → monsters(id) ON DELETE CASCADE
  weapon_type      weapon_type ENUM {longsword, greatsword}  NOT NULL
  content          text    NOT NULL      -- compiled weapon-page MDX, filled by 002
  published_at     timestamptz NULL      -- NULL or future = hidden; past = live
  created_at       timestamptz NOT NULL DEFAULT now()
  updated_at       timestamptz NOT NULL DEFAULT now()
  UNIQUE (monster_id, weapon_type)

clips
  id               bigint  PK, generated always as identity
  monster_id       bigint  NOT NULL  FK → monsters(id) ON DELETE CASCADE
  punish_guide_id  bigint  NULL      FK → punish_guides(id) ON DELETE CASCADE
  slug             text    NOT NULL
  url              text    NOT NULL      -- CDN URL, wired in 003
  caption          text    NULL
  created_at       timestamptz NOT NULL DEFAULT now()
  UNIQUE (monster_id, slug)
```

Integration points: the exported schema objects give 002/004 typed table references; the exported
client gives them a connection. `published_at` is the column 004's loaders filter on for
visibility.

### Confidence <!-- required -->

**Level:** High

**Rationale:** The schema is fully specified in ARCHITECTURE and was confirmed field-by-field in
dialogue. Drizzle + drizzle-kit is a well-trodden path for TypeScript + Postgres, and the scope is
deliberately narrow (DDL + connection only, no queries, no data). The main risk is trivial and
self-correcting: the exact Postgres driver and `drizzle-kit` config are conventional choices that
surface immediately if wrong. No spike needed.

### Key Decisions <!-- optional -->

- **Drizzle over Prisma/Kysely/raw SQL** — TypeScript-first, generates SQL migrations, lightweight
  typed client suited to Nitro/serverless; schema and queries share one source of truth.
- **`bigint` generated-always identity over UUID** — simpler, no extension, sortable; IDs are not
  user-facing (slugs are), so UUID's opacity buys nothing here.
- **`weapon_type` as a Postgres enum** over text + CHECK — the value set is closed and central
  to routing; the enum gives a typed source the schema can reuse.
- **`published_at` gates visibility** — NULL/future hidden, past live. Lets drafts land in the DB
  without exposing them; cheap now, costly to retrofit. Enforcement lives in loaders (004), not
  this feature.
- **`overview_content` nullable** — a monster row can exist before its general MDX is ingested.
- **Thin client, no query helpers** — 001 owns the connection; consumers own their queries. Keeps
  the foundation independently verifiable without prejudging 002/004's access patterns.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for DB queries; TypeScript as first defense):

- **Migration applies cleanly** — run the migration against an empty (test/local) Postgres and
  assert the three tables, the enum, and the constraints exist.
- **Constraint behavior (Vitest)** — insert fixtures through the shared client and assert:
  - duplicate `(game, slug)` on monsters is rejected;
  - a second `punish_guides` row with the same `(monster_id, weapon_type)` is rejected;
  - duplicate `(monster_id, slug)` on clips is rejected;
  - deleting a monster cascades to its `punish_guides` and `clips`;
  - `weapon_type` rejects a value outside `{longsword, greatsword}`.
- **Client connects** — a smoke test that the exported client opens a connection from
  `DATABASE_URL` and runs a trivial query.
- No E2E here — Playwright route coverage arrives with rendering (004/008).
