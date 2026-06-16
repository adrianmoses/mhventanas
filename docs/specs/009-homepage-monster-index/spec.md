# Spec: Homepage Monster Index + Site Navigation

| Field | Value |
|---|---|
| id | 009 |
| status | approved |
| created | 2026-06-16 |

---

## Why <!-- required -->

The v1 vertical slice (001–007) shipped the full content pipeline and three
server-rendered Chatacabra pages, but left no way to *reach* them. The homepage
(`src/app/routes/index.tsx`) renders a single `<h1>` and one paragraph: no links,
no loader, no list of what exists. The only in-app navigation is the breadcrumb
and weapon chips that live *on* the guide pages — which a reader can only see
after already arriving at a guide. In practice the site is un-navigable: a hunter
landing on `/` has no path to `/guias/wilds/chatacabra` short of typing the URL.

This feature makes the shipped content discoverable. It turns the homepage into a
real entry point — a list of available monster guides, queried from the database
so it grows on its own as content is ingested — and gives every page a consistent
way back home. Without it, the content authored in 005–007 (and everything after)
has a render target but no front door, and any SEO work in 008 would be polishing
pages that the site itself never links to.

### Consumer Impact <!-- required -->

The consumer is OVERVIEW's target reader: a Spanish-speaking, intermediate-to-
advanced Monster Hunter player. Today, unless someone hands them a deep link, they
hit the homepage and stop. After this feature they land on `/`, see the monsters
that have a published general guide (at launch: Chatacabra / Wilds), and click
straight into a guide. Because the list is DB-driven, every monster added later
appears automatically with no homepage edit — the front door scales with content.
A persistent home link in the page header also lets them get back to the index
from any guide, completing the navigation loop the breadcrumb only half-closed.

### Roadmap Fit <!-- required -->

This gap is not represented in the existing roadmap — 008 is SEO + i18n + E2E and
assumes pages are reachable. 009 depends on 004 (routes, loaders, the
`loadGeneralData` pattern and `monsters` query it reuses) and on there being at
least one monster with content (005). It is a **prerequisite for 008**: indexing,
sitemaps, and link-unfurl polish are premature while the homepage links nowhere,
and the Playwright "core routes" suite should include the homepage→guide path.
Recommendation: sequence 009 **before** 008. It does not depend on the B1/B2
backlog items, though it intersects B2 (see Open Questions).

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] Visiting `/` server-renders a list of every monster that has a general
      guide (compiled `overview_content` present), each linking to its general
      page at `/guias/:game/:monster`.
- [ ] Each list entry shows at least the monster name; the game is surfaced (label
      or grouping) so the same monster slug across games stays unambiguous.
- [ ] The list is produced by a server loader querying Postgres — no monster names
      or links are hardcoded in the component. Ingesting a new monster makes it
      appear on `/` with no code change.
- [ ] A monster with no general content (`overview_content` NULL) does not appear
      as a live link (it would lead to an empty page).
- [ ] When no monsters qualify, the homepage shows a graceful Spanish empty state
      rather than a blank or broken list.
- [ ] Every page exposes a consistent way back to the homepage (a header/home link
      rendered from the root layout), and the homepage link target is `/`.
- [ ] The homepage renders correctly on initial SSR load (view-source shows the
      monster links) and hydrates without console errors.
- [ ] All copy on the homepage and in the shared header is Spanish.
- [ ] The homepage keeps a meaningful `<title>` and meta description (it already
      sets a title; preserve it).

### Non-Goals <!-- required -->

- **Search, filtering, sorting, pagination** — a simple list is enough at launch
  scale (one monster). Defer until the roster is large enough to need it.
- **Rich landing-page design** — hero art, monster thumbnails/renders, stat
  previews, the punish-window timeline teaser. 009 is navigation + a clean list,
  consistent with the existing spare CSS; visual richness is a later styling pass.
- **A general-page visibility gate** — `published_at` is weapon-only today, so the
  index gates on "has `overview_content`", not on a publish flag. Adding a real
  draft gate for general pages is backlog **B2**, not this feature.
- **Per-game landing routes or a `/guias` index route** — the homepage *is* the
  index at launch. A dedicated game hub can come later if games multiply.
- **Footer, About, or any non-guide chrome** — out of scope per OVERVIEW non-goals.
- **SEO/i18n infrastructure** — Open Graph, canonical URLs, sitemap, robots,
  locale plumbing remain 008.

### Open Questions <!-- optional -->

- **Index inclusion rule.** Gate on `overview_content IS NOT NULL` (proposed), or
  also require at least one *published* weapon guide? Proposed: a monster with a
  general guide is worth listing even before its weapon pages are published —
  matches B2's framing that general pages have no publish gate today. Deferring to
  the proposed rule unless review says otherwise.
- **Grouping by game.** Flat list with a game label per row (proposed, simplest at
  one game) vs. grouping under game headings. Low-risk either way; proposed flat.

---

## How <!-- required -->

### Approach <!-- required -->

**Loader — a monsters-index query.** Add a `loadMonsterIndex()` to
`src/app/loaders/queries.ts` alongside `loadGeneralData`, reusing its Drizzle
patterns. It selects `monsters` rows with non-null `overviewContent`, returning
`{ name, slug, game, variant }` ordered for stable display (e.g. by game then
name). No clips or MDX evaluation are needed — this is a lightweight metadata list,
not a content render.

**Homepage route.** Convert `src/app/routes/index.tsx` from a static component into
a route with a loader, mirroring `guias.$game.$monster.tsx`: wrap the query in a
`createServerFn({ method: "GET" })` so the postgres client stays server-only, call
it from the route `loader`, and render the result. The component keeps the intro
copy and adds a `<ul>` of `<Link to="/guias/$game/$monster" params={…}>` entries,
plus a Spanish empty state when the list is empty. Reuse existing CSS;
`weapon-links` is a reasonable visual precedent for the link list, or add a small
`monster-index` rule in `styles.css` — styling stays minimal per Non-Goals.

**Shared header / home link.** Add a lightweight header to the root layout
(`src/app/routes/__root.tsx`, inside `RootDocument`) with a single `<Link to="/">`
home link, so every page — guides included — can return to the index. This closes
the navigation loop without touching each route. Keep it spare (one line, existing
palette); a `.site-header` rule in `styles.css`.

**No schema, ingest, or media changes.** This is read-only UI over existing data;
`monsters.overview_content` already carries everything the index needs.

### Confidence <!-- required -->

**Level:** High

**Rationale:** Every piece already exists in the codebase. The query is a simpler
variant of `loadGeneralData` (same table, fewer joins); the server-fn + loader +
SSR-render pattern is copied verbatim from the working guide routes; the link
component and CSS conventions are in place. There is no new dependency, no MDX
evaluation, no schema migration, and the publish-gating subtlety is sidestepped by
the explicit "has `overview_content`" rule. The only judgment calls are the two
deferred Open Questions, neither of which blocks implementation.

### Key Decisions <!-- optional -->

- **DB-driven index over a hardcoded list.** The whole point is that content scales
  without homepage edits; a static list would silently rot as monsters are added.
  Costs one cheap metadata query on the homepage.
- **Gate the index on `overview_content`, not on a publish flag.** General pages
  have no `published_at` today (B2). Gating on content presence avoids listing dead
  links now without pulling B2's visibility-gate work into this feature.
- **Home link in the root layout, not per-route.** One shared header gives every
  page — present and future — the return path, rather than repeating nav in each
  route component.
- **Defer richness and search.** At one monster, a styled list is the right size;
  building filtering/hero UI now would be speculative.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for queries, Playwright for core routes,
TypeScript first):

- **Vitest — `loadMonsterIndex` against the test DB (seeded via the existing
  ingest/fixtures path used by 004):**
  - Returns monsters that have `overview_content`; a monster with NULL
    `overview_content` is excluded.
  - Returns the fields the homepage needs (name, slug, game) in the expected order.
  - Empty DB → empty array (drives the empty-state path, not a throw).
- **Playwright — homepage as a core route (extends the 004 smoke suite):**
  - `/` renders server-side: the Chatacabra entry is present in the initial HTML
    and links to `/guias/wilds/chatacabra`.
  - Following that link reaches the general page (the homepage→guide path works
    end to end).
  - The shared home link on a guide page returns to `/`.
- **TypeScript** across the new loader, the server fn, and the route component.

Reuse the `test/fixtures/content/wilds/chatacabra` fixtures and the ingest path to
seed the DB; do not author new content.
