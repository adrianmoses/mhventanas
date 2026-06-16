# Decision Record: Homepage Monster Index + Site Navigation

| Field | Value |
|---|---|
| id | 009 |
| status | implemented |
| created | 2026-06-16 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

The v1 slice (001–007) shipped the content pipeline and three server-rendered
Chatacabra pages, but the homepage was a static `<h1>` + paragraph with no links
and no loader. The only in-app navigation lived *on* the guide pages (the weapon
breadcrumb and the general page's weapon chips), so the site was un-navigable
from `/` — surfaced directly by the user ("the homepage does not seem to lead to
any other pages"). 009 was specced and approved to close that gap before the SEO/
E2E polish in 008, on the reasoning that indexing unreachable pages is premature.

The implementation was a small, read-only UI layer over existing data — no schema,
ingest, or media changes. Every integration point (the loader/`createServerFn`/SSR
pattern, the test harness, file-based routing) already existed and was reused. One
thing not anticipated by the spec surfaced during verification: the Playwright
suite seeded clip URLs from the developer's real `.env` `CDN_BASE_URL` rather than
a pinned test value (see Spec Gaps Exposed).

## Decision <!-- required -->

The homepage is now a loader route backed by a new `loadMonsterIndex()` query that
returns every monster with a non-null `overview_content`, ordered by game then
name, each rendered as a link to `/guias/:game/:monster` with a muted game label
and a Spanish empty state when none qualify. A shared `.site-header` home link was
added to the root layout (`__root.tsx`) so every page — guides and not-found
included — can return to the index. Inclusion is gated on content presence (not a
publish flag) because general pages have no `published_at` today (that gate is
backlog B2). The list is DB-driven, so newly ingested monsters appear with no code
change.

---

## Alternatives Considered <!-- required -->

### Index inclusion rule

**Option A — gate on `overview_content IS NOT NULL`:**
- Pros: a monster with a general guide is worth listing even before its weapon
  pages are published; avoids dead links to empty pages; no new gating machinery.
- Cons: no author-facing draft control for general pages.

**Option B — also require ≥1 published weapon guide:**
- Pros: a stricter "fully ready" bar.
- Cons: would hide a perfectly good general guide whose weapon pages lag; conflates
  weapon-level `published_at` with general-page visibility (which it does not model).

**Chosen:** Option A. It matches the spec's resolved open question and defers a real
general-page visibility gate to backlog B2 rather than inventing one here.

### Monster list presentation

**Option A — flat list with a per-row game label** (chosen): simplest at launch
scale (one game), disambiguates the same monster slug across games via the label.

**Option B — group under game headings:** nicer at scale, premature at one game.

**Chosen:** Option A, per the spec's resolved default. Grouping can come later if
games multiply (noted as a non-goal/future item).

### Home navigation placement

**Option A — one shared header in the root layout** (chosen): every present and
future page gets the return path for free; no per-route duplication.

**Option B — add a home link to each route's nav:** repetitive, easy to forget on
new routes.

**Chosen:** Option A.

### E2E clip-URL determinism (in-implementation)

**Option A — pin `CDN_BASE_URL=https://cdn.test` in the e2e `global-setup`**
(chosen): mirrors `vitest.config.ts`, makes seeded clip URLs independent of the
developer's `.env`.

**Option B — leave it / change the test to read the env value:** the assertion is
meant to be a fixed, known URL; reading the env would make the smoke test assert a
moving target and hide drift.

**Chosen:** Option A — see Spec Gaps Exposed.

---

## Tradeoffs <!-- required -->

- **Minimal styling over a rich landing page.** The index is a clean text list with
  the existing spare palette — no hero art, monster thumbnails, or stat previews.
  This optimizes for shipping navigation now and keeps it consistent with the
  current design; visual richness is deferred to a later styling pass.
- **Content-presence gate over a publish gate.** Listing every monster with an
  overview is simple and avoids dead links, but it gives no way to stage a
  general-page draft (B2). Accepted because no draft workflow for general pages
  exists yet.
- **Flat list over grouping.** Right-sized for one game; will need revisiting when
  the roster spans multiple games.

---

### Spec Divergence <!-- optional -->

The implementation matched the spec. No acceptance criterion was dropped, narrowed,
or reinterpreted; all nine are satisfied. The only work beyond the spec's stated
scope was a test-harness fix (`CDN_BASE_URL` pin) required to make the e2e
verification deterministic — captured below as a spec gap rather than a divergence,
since it changed no product behavior.

| Spec Said | What Was Built | Reason |
|---|---|---|
| (no divergence) | As specified | — |

---

## Spec Gaps Exposed <!-- optional -->

- **The e2e harness did not pin `CDN_BASE_URL`.** `test/e2e/global-setup.ts` loads
  `.env` via `dotenv/config` and runs `ingest`, which bakes clip URLs from
  `CDN_BASE_URL` at ingest time. `vitest.config.ts` pins this to `https://cdn.test`,
  but the e2e setup did not — so a real `CDN_BASE_URL` in a developer's `.env`
  (added this session for the R2 upload test) leaked into seeded clip URLs and
  broke the fixed-URL smoke assertion. Fixed by pinning `CDN_BASE_URL=https://cdn.test`
  in `global-setup.ts`. This is a pre-existing latent coupling unrelated to 009's
  product scope; no further follow-up needed, but worth noting for any future test
  that depends on ingest-time env.
- **Minor:** `Route.useLoaderData()` did not infer the loader's return type, so the
  homepage annotates it explicitly (`const monsters: MonsterIndexEntry[] = …`),
  matching the existing pattern in the guide routes. Not a spec gap — an established
  local idiom.

---

## Test Evidence <!-- required -->

`pnpm typecheck` — clean (no output / exit 0).

`pnpm test` (Vitest) — includes the new `test/app/home.test.ts` (lists Chatacabra;
excludes a directly-inserted monster with NULL `overviewContent`; empty DB → `[]`):

```
 Test Files  16 passed (16)
      Tests  52 passed (52)
   Start at  22:11:07
   Duration  6.25s
```

`pnpm test:e2e` (Playwright) — includes the two new homepage tests (SSR list +
click-through, and header-returns-home navigation):

```
Running 7 tests using 7 workers
  ✓  homepage lists the monster guide server-side and links into it (95ms)
  ✓  unknown monster returns 404 with the Spanish not-found view (74ms)
  ✓  unpublished weapon page returns 404 (111ms)
  ✓  published weapon page renders content server-side (101ms)
  ✓  general page renders content server-side with only published weapon links (108ms)
  ✓  homepage links navigate to the guide, and the header returns home (207ms)
  ✓  general page hydrates cleanly with a working <video> (214ms)
  7 passed (3.0s)
```
