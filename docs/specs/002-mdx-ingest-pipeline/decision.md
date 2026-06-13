# Decision Record: MDX Ingest Pipeline

| Field | Value |
|---|---|
| id | 002 |
| status | implemented |
| created | 2026-06-13 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

001 left an empty schema; 002 is the bridge that turns authored MDX into the Postgres read store.
The spec rated confidence **Medium** because the unproven part was the compile→store→run-at-render
contract: that an `@mdx-js/mdx` function-body string stored as text could be run server-side later
(by 004) and rendered with a `<Clip>` component injected at render. We de-risked that first with a
round-trip spike before building anything else — it passed, so the rest of the pipeline was built
on a proven foundation.

Library facts confirmed during planning and held up in implementation: `@mdx-js/mdx@3.1.1`
(ESM-only), `gray-matter@4.0.3`, React 19 (dev-only, for the round-trip render test). The build
reused 001's `db`/`schema`/table exports, the `TRUNCATE … RESTART IDENTITY CASCADE` test isolation,
and the `.cause.code` error-assertion finding.

## Decision <!-- required -->

Built a standalone `pnpm ingest` CLI (`src/ingest/`) that walks `content/{game}/{monster}/`
(`index.mdx` = general guide, `longsword.mdx`/`greatsword.mdx` = weapon guides), compiles each MDX
body to an `@mdx-js/mdx` **function-body string** via `gray-matter` (frontmatter) + `compile(...,
{outputFormat:"function-body"})`, and idempotently upserts `monsters` / `punish_guides` / `clips`
on the 001 unique keys using Drizzle `onConflictDoUpdate`. `<Clip slug>` references are collected
during the same compile pass by a small `unist-util-visit` remark plugin and validated against each
file's frontmatter `clips:` list; the compiled output keeps slug references (resolved at render in
004). Ingestion is **two-phase** — parse + compile + validate every file in memory first (so any
bad input aborts before a single row is written), then upsert per monster inside a transaction.
`updated_at` is bumped in the update branches, resolving the write-semantics question 001 deferred.

---

## Alternatives Considered <!-- required -->

### Stored content form (settled in the spec, restated)

**Option A — compiled function-body string:** `run()` it at render with a component map.
- Pros: preserves React components (`<Clip>`, future timeline bar); SSR + SEO; standard
  mdx-remote pattern.
- Cons: render side must `run()` the string; a wrong output format only surfaces in 004.

**Option B — compiled static HTML:** render to HTML at ingest.
- Pros: simplest render; bulletproof SEO.
- Cons: no client interactivity beyond plain `<video>`; loses React composition.

**Option C — raw MDX:** compile in the loader.
- Pros: defers compile complexity.
- Cons: DB is just a source cache, not the "compiled read store" ARCHITECTURE describes.

**Chosen:** A. De-risked up front with the round-trip spike (see Test Evidence) so the
004-only failure mode couldn't bite later.

### Clip `<Clip slug>` extraction

**Option A — remark plugin in the compile pass** (`unist-util-visit` over `mdxJsxFlowElement` /
`mdxJsxTextElement` named `Clip`).
- Pros: one parse; compiled code + referenced slugs come back together on `vfile.data`.
- Cons: a little unified/mdast typing friction.

**Option B — separate regex or second AST parse.**
- Pros: no plugin.
- Cons: regex is brittle; a second parse duplicates work.

**Chosen:** A. Both `mdxJsxFlowElement` (block) and `mdxJsxTextElement` (inline) are visited, since
MDX emits different node types by placement.

### Upsert transactionality / failure isolation

**Option A — two-phase (validate-all, then write), one transaction per monster.**
- Pros: content errors (bad frontmatter, missing clip, uncompilable MDX) abort with zero partial
  writes; per-monster scoping localizes any genuine DB fault and maximizes batch progress.
- Cons: not a single global transaction across all monsters.

**Option B — one transaction for the whole run.**
- Pros: strict all-or-nothing across every monster.
- Cons: heavier; phase-1 validation already guarantees content correctness, so global rollback
  buys little for a content batch.

**Chosen:** A.

### Frontmatter validation

**Option A — zod schemas.** Precise issue paths for actionable errors; `z.infer` removes hand-kept
types; `.strict()` turns typos into fail-fast errors. New prod dep.
**Option B — hand-rolled checks.** No dep, but worse messages and duplicated types.

**Chosen:** zod.

---

## Tradeoffs <!-- required -->

- **Optimised for:** a proven render contract and safe, idempotent re-runs. Two-phase validation
  means malformed content never leaves the DB half-written.
- **Given up / accepted:** four new prod deps (`@mdx-js/mdx`, `gray-matter`, `unist-util-visit`,
  `zod`) plus dev-only React for the round-trip test; **upsert-only** (no orphan pruning, so the DB
  can drift from git until a later reconciliation feature); **literal `<Clip slug>` only** (dynamic
  slugs can't be statically validated); clip URLs are author-provided strings (real CDN is 003).

---

### Spec Divergence <!-- optional -->

The implementation matched the spec's scope, acceptance criteria, and approach. The only additions
were three under-specified points the spec left open, resolved here as consistent extensions of its
fail-fast stance (and surfaced in the approved plan):

| Spec Said | What Was Built | Reason |
|---|---|---|
| Frontmatter carries `clips`/`published_at` (weapon-file key unspecified) | Authored key `published_at` (snake) → DB `publishedAt` | Spec only ever showed `published_at`; reads naturally in authored files |
| Fail fast on the enumerated bad cases | Also fail fast on a clip slug declared in two files under one monster | `clips(monster_id, slug)` spans the whole monster; otherwise one file silently clobbers another's row |
| `<Clip slug="…">` resolves at render | Only **literal** slug values accepted; `<Clip slug={expr}>` aborts | A dynamic slug can't be statically validated against frontmatter |

No divergence in storage form, clip resolution, content layout, upsert keys, or test approach.

---

## Spec Gaps Exposed <!-- optional -->

- **Weapon-file frontmatter shape** was never shown in the spec (only the DB column). Resolved as
  `published_at`; worth reflecting in author-facing docs when 005–007 add real content.
- **Cross-file clip-slug collision** within a monster is a real footgun the spec's enumerated cases
  didn't cover; now an explicit error.
- **`clips` has no `updated_at`** — the idempotency AC's "bump updated_at" applies only to
  monsters/punish_guides; clip rows stay byte-stable on re-run. (Asymmetry, not a problem.)
- **Same-tick `updated_at`** can't be asserted as strictly increasing in fast back-to-back runs;
  the test asserts `updatedAt >= createdAt` and row-set stability instead.

---

## Test Evidence <!-- required -->

`pnpm typecheck` (`tsc --noEmit`) exits 0. End-to-end CLI run against the dev DB:
`pnpm ingest` → `Ingested 1 monsters, 2 guides, 3 clips.` (exit 0, no hang — `sql.end()` closes the
pool); a second run reported the same counts with `updated_at > created_at`. `psql` confirmed the
monster row (compiled `overview_content`), both guides (longsword `published_at=2026-06-01`,
greatsword `published_at` NULL), and three clips (general clip `punish_guide_id` NULL, weapon clips
linked, caption stored).

Full Vitest suite (`pnpm exec vitest run --reporter=verbose`) — 21 passed across 9 files (8 from
001 + the new 002 tests):

```
 ✓ test/ingest/roundtrip.test.ts > … renders a <Clip> via a provided component map 24ms
 ✓ test/ingest/roundtrip.test.ts > … throws when <Clip> is referenced but no component is provided 2ms
 ✓ test/ingest/general.test.ts > … creates a monster row from index.mdx with path-derived slug/game 80ms
 ✓ test/ingest/weapon.test.ts > … creates punish_guides with weapon_type, content, and published_at mapped 73ms
 ✓ test/ingest/clips.test.ts > … upserts clips from frontmatter, linked to monster and (for weapon files) guide 81ms
 ✓ test/ingest/idempotency.test.ts > … re-running does not duplicate rows and advances updated_at 102ms
 ✓ test/ingest/edit-in-place.test.ts > … updates the existing monster row when its content changes 76ms
 ✓ test/ingest/validation.test.ts > … rejects a <Clip> with no matching frontmatter entry 23ms
 ✓ test/ingest/validation.test.ts > … rejects an unknown weapon filename 1ms
 ✓ test/ingest/validation.test.ts > … rejects a weapon file whose monster has no index.mdx 1ms
 ✓ test/ingest/validation.test.ts > … rejects missing required frontmatter (name) 2ms
 ✓ test/ingest/validation.test.ts > … rejects uncompilable MDX 3ms
 ✓ test/ingest/validation.test.ts > … rejects a clip slug declared in two files under one monster 4ms
 … (8 schema/client tests from 001 also pass)
 Test Files  9 passed (9)
      Tests  21 passed (21)
```
