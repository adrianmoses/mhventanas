# Spec: MDX Ingest Pipeline

| Field | Value |
|---|---|
| id | 002 |
| status | approved |
| created | 2026-06-13 |

---

## Why <!-- required -->

Git is the source of truth for content; Postgres is the read store (ARCHITECTURE). The schema
from 001 exists but is empty. This feature is the bridge: it reads authored MDX from `content/`,
compiles it (resolving the custom `<Clip>` component), and idempotently upserts the result into
`monsters`, `punish_guides`, and `clips`. Until it exists, nothing can be rendered and the
read store stays empty.

### Consumer Impact <!-- required -->

- **Route loaders (004)** — the primary consumer. They read the compiled function-body strings
  (`overview_content` / `content`) and the `clips` rows this pipeline writes, then run + SSR them.
  This feature defines the contract: what compiled form is stored and how `<Clip>` references
  resolve.
- **Content authors** — the human consumers. They write MDX files under `content/` and run the
  pipeline to publish; this feature defines the directory layout, frontmatter schema, and the
  fail-fast validation that tells them when a file is malformed.
- The end hunter benefits transitively: ingested content is what eventually renders as a guide.

### Roadmap Fit <!-- required -->

Second in the v1 sequence. Depends on **001** (the schema + DB client it writes through). Blocks
**005–007** (the Chatacabra content has nowhere to go without it) and feeds **004** (loaders read
what this writes). Independent of **003** (media hosting) — clip URLs here are author-provided
strings and may be placeholders until 003 wires the real CDN.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] A CLI command (`pnpm ingest`) walks `content/`, compiles every MDX file, and upserts rows
      into `monsters`, `punish_guides`, and `clips` against `DATABASE_URL`.
- [ ] `content/{game}/{monster}/index.mdx` produces/updates a `monsters` row: `game` + `slug` from
      the path; `name`/`variant` from frontmatter; `overview_content` = the compiled function-body
      string.
- [ ] `content/{game}/{monster}/{weapon}.mdx` (weapon ∈ {`longsword`,`greatsword`}) produces/updates
      a `punish_guides` row: `weapon_type` from the filename; `content` = compiled function-body;
      `published_at` from frontmatter (absent ⇒ NULL).
- [ ] Clip rows are upserted from each file's frontmatter `clips:` list (`slug`, `url`, `caption?`),
      linked to the monster (and to the punish guide for weapon files).
- [ ] `<Clip slug="…"/>` in a body that has no matching clip entry aborts the run with a clear
      error naming the file and slug. The compiled output references clips by `slug` only
      (URL resolved at render in 004).
- [ ] Re-running the pipeline with unchanged content is a no-op beyond bumping `updated_at`; it
      never duplicates rows (upsert on the 001 unique keys).
- [ ] Editing a file and re-running updates the corresponding row in place (new compiled content,
      `updated_at` advanced).
- [ ] Malformed input fails fast with an actionable message: invalid/missing required frontmatter,
      an unknown weapon filename, a weapon file whose monster has no `index.mdx`, or uncompilable
      MDX.

### Non-Goals <!-- required -->

- No CDN upload or real media hosting — `clips.url` is whatever the author wrote (003 owns this).
- No rendering, routes, SSR, or `published_at` visibility enforcement (004).
- No site read-side query helpers (get-monster-by-slug, etc.) — those land with 004.
- No content authoring UI or admin.
- No orphan pruning — removing an MDX file or a frontmatter clip does **not** delete its DB row.
  Upsert-only; full-sync/deletion is deferred (the DB can drift from git until a later feature
  adds reconciliation).
- No real Chatacabra content (005–007). Tests use small fixtures.

### Open Questions <!-- optional -->

None blocking. The content form, clip source, clip resolution, frontmatter-vs-inline clips, and
upsert-only stance were all resolved in dialogue. The compile→run round-trip is a confidence risk,
not an open question — see Validate below.

---

## How <!-- required -->

### Approach <!-- required -->

A standalone Node CLI (`src/ingest/index.ts`, run via `tsx`, script `pnpm ingest`) that reuses the
001 DB client (`src/db`). Steps:

1. **Discover** — walk `content/` for `index.mdx` (general) and `{weapon}.mdx` (weapon) files.
   Derive `game` and monster `slug` from the path; `weapon_type` from the weapon filename.
2. **Parse** — split frontmatter from body with `gray-matter`. Validate the frontmatter shape
   (general: `name` required, `variant?`, `clips?`; weapon: `published_at?`, `clips?`).
3. **Compile** — compile the MDX body with `@mdx-js/mdx` `compile(..., { outputFormat:
   "function-body" })` to a portable JS string. `<Clip>` is treated as a provided component
   (resolved at render by 004), so the compiled output carries `<Clip slug="…"/>` references, not
   URLs.
4. **Validate clip references** — collect `<Clip slug>` usages from each body; every referenced
   slug must have a matching entry in that file's frontmatter `clips:` list, else abort.
5. **Upsert (FK-safe order)** — monsters → punish_guides → clips, each via Drizzle
   `onConflictDoUpdate` on its 001 unique key:
   - `monsters` on `(game, slug)` → set `name`, `variant`, `overview_content`, `updated_at`.
   - `punish_guides` on `(monster_id, weapon_type)` → set `content`, `published_at`, `updated_at`.
   - `clips` on `(monster_id, slug)` → set `url`, `caption`, `punish_guide_id`.
   `updated_at` is set explicitly in each update branch — this resolves the auto-bump question the
   001 decision record deferred to this feature (handled in the upsert, no DB trigger).

**Frontmatter clips block** (confirmed) — URLs/captions live in frontmatter, body references by
slug:

```yaml
---
name: Chatacabra
clips:
  - slug: salto-bilis
    url: https://cdn.example/placeholder/salto-bilis.webm
    caption: Salto con bilis
---
... <Clip slug="salto-bilis" /> ...
```

Integration: writes through the existing `db`/`schema` exports; adds ingest-only deps
(`@mdx-js/mdx`, `gray-matter`). No changes to the 001 schema.

### Confidence <!-- required -->

**Level:** Medium

**Rationale:** The walk/parse/validate/upsert mechanics are well-understood and low-risk. The
uncertain part is the **compile→store→run-at-render contract**: that an `@mdx-js/mdx`
function-body string stored as text can be run server-side later (004) with a `<Clip>` component
map and SSR'd correctly. 002 produces that artifact, so a wrong output format would only surface in
004 — worth de-risking now.

**Validate before proceeding:** Spike the round-trip before building the full walker — compile a
representative MDX snippet (including `<Clip slug>` and a heading/paragraph) to function-body,
then `run()` it (via `@mdx-js/mdx`'s run with `react/jsx-runtime`) with a stub `Clip` component and
assert it renders to the expected HTML string. Confirms the stored form is renderable and the
`<Clip>` resolution shape works end to end.

### Key Decisions <!-- optional -->

- **Function-body compiled output** stored as text (over static HTML or raw MDX) — preserves React
  components and SEO; standard mdx-remote pattern.
- **Clips from frontmatter, referenced by slug, resolved at render** — decouples content from URLs
  so 003 can swap CDN URLs without re-ingesting bodies.
- **Path-derived slugs** (`game`, monster) over frontmatter slugs — keeps URL and storage keys in
  one place and matches 004's routes.
- **`index.mdx` for the general guide** (vs `{monster}.mdx`) — avoids a file/dir name clash with
  the weapon subdirectory and reads cleanly.
- **Upsert-only, no deletes** — safe default; DB-from-git reconciliation deferred.
- **`updated_at` bumped in the upsert** — resolves the 001-deferred write-semantics question.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for the ingest pipeline; TypeScript first). Reuse the 001
test DB (`mhventanas_test`) and the `TRUNCATE … RESTART IDENTITY CASCADE` isolation. Note the 001
finding: Drizzle 0.45 wraps DB errors, so assert on `error.cause.code` for any DB-level rejection.

- **Round-trip spike test** (the Validate step, kept as a regression test): compile a fixture MDX
  with `<Clip>`, `run()` it with a stub component map, assert rendered HTML.
- **General ingest** — fixture `content/wilds/<m>/index.mdx` → one `monsters` row with path-derived
  `game`/`slug`, frontmatter `name`/`variant`, non-null `overview_content`.
- **Weapon ingest** — `longsword.mdx`/`greatsword.mdx` → `punish_guides` rows with correct
  `weapon_type`, `published_at` mapped (present and absent), linked to the monster.
- **Clip upsert** — frontmatter clips become `clips` rows (slug/url/caption), linked to monster and,
  for weapon files, to the punish guide.
- **Idempotency** — run twice on the same fixtures: row counts stable, no duplicates; `updated_at`
  advances on the second run.
- **Edit-in-place** — change fixture content, re-run, assert the row's `content`/`overview_content`
  updated and no new row created.
- **Validation/fail-fast** — `<Clip slug>` with no frontmatter entry; unknown weapon filename;
  weapon file with no monster `index.mdx`; missing required `name`; uncompilable MDX — each aborts
  with a clear error.
