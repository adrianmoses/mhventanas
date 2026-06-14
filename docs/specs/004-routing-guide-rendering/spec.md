# Spec: Routing + Guide Rendering

| Field | Value |
|---|---|
| id | 004 |
| status | implemented |
| created | 2026-06-14 |

---

## Why <!-- required -->

The first three features built the content supply chain end to end — schema (001),
the MDX ingest pipeline (002), and media hosting (003) — but produced nothing a
hunter can look at. Everything so far writes *into* Postgres. This feature is the
read half of the v1 vertical slice: it stands up the TanStack Start application
for the first time and renders ingested content as server-rendered, shareable
guide pages. Without it, the Chatacabra content authored in 005-007 has nowhere to
land.

It exists because the product's whole value — showing punish timing with looped
video rather than describing it in prose — only reaches the consumer once compiled
MDX in the database is evaluated into HTML and served. This feature makes the
pipeline visible.

### Consumer Impact <!-- required -->

The consumer is the OVERVIEW's target reader: a Spanish-speaking, intermediate-to-
advanced Monster Hunter player who mains Longsword or Greatsword. This is their
first actual surface. They navigate to a monster's general guide at
`/guias/:game/:monster` (e.g. `/guias/wilds/chatacabra`) and a weapon punish guide
at `/guias/:game/:monster/:weapon` (e.g. `.../longsword`), and they get a
server-rendered page with prose and autoplaying, looped, muted WebM clips — fast,
linkable, and indexable. Because the slug drives the URL, pages are shareable
between players.

### Roadmap Fit <!-- required -->

004 depends on 001 (the tables and slugs it queries), 002 (the compiled
`function-body` MDX it evaluates and the `<Clip>` references it resolves), and 003
(the CDN URLs stored on `clips` rows that the rendered `<Clip>` points at). It is a
hard prerequisite for 005-007: those features author the Chatacabra general,
Longsword, and Greatsword pages, and need a working render target to author
against. It deliberately stops short of 008 (SEO + i18n polish + full Playwright
E2E), delivering only the minimal SSR metadata and smoke coverage needed to prove
the routes work.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] Visiting `/guias/:game/:monster` for an ingested monster server-renders its
      general guide: the compiled `overview_content` MDX evaluated to HTML.
- [ ] Visiting `/guias/:game/:monster/:weapon` for a published punish guide
      server-renders that weapon's compiled `content` MDX to HTML.
- [ ] `<Clip>` references in the rendered MDX resolve to a `<video>` element
      pointing at the clip's CDN `url`, with `autoplay loop muted playsinline`, and
      the clip's `caption` surfaced; clips degrade gracefully when WebM can't play.
- [ ] A guide whose `published_at` is NULL or in the future is treated as not
      live: its weapon route returns 404 and the general page omits the link to it.
- [ ] An unknown game/monster slug, or a weapon with no (published) guide, returns
      an SSR 404 status with a minimal not-found view — not a 200 or a crash.
- [ ] The general page links to each *published* weapon guide for that monster.
- [ ] Each page server-renders a `<title>` and meta description derived from the
      monster/weapon so the response is meaningful to crawlers and link unfurls.
- [ ] Pages render correctly on initial SSR load (view-source shows content) and
      hydrate without console errors.
- [ ] All copy and slugs in the routing/not-found chrome are Spanish.

### Non-Goals <!-- required -->

- **The page content itself** — Chatacabra general/LS/GS prose and clips are
  005-007. 004 renders whatever has been ingested; the test fixtures suffice to
  prove rendering.
- **Rich design components** — the hero/stat block, move-card anatomy, and the
  color-coded punish-window timeline bar (ARCHITECTURE design-inspiration) are
  deferred to the content features. 004 is structural rendering with minimal CSS.
- **Full SEO + i18n + E2E** — Open Graph/Twitter cards, canonical URLs, sitemap,
  robots, locale infrastructure, and the full Playwright suite are 008. 004 ships
  only basic `<title>`/meta and a smoke test.
- **Author-facing draft/preview UI** — `published_at` gating is enforced at the
  loader, but there is no preview mode, unpublished-content viewer, or admin route.
- **Choosing the deploy target** — Nitro builds and runs locally; the hosting
  platform remains TBD (an OVERVIEW/ARCHITECTURE open question).

### Open Questions <!-- optional -->

- None blocking. The deploy target stays deferred per ARCHITECTURE; it does not
  affect the route/loader/render work in this feature.

---

## How <!-- required -->

### Approach <!-- required -->

**Bootstrap the app.** No TanStack Start app exists yet — there is no vite/app
config, route tree, or app entry. Add TanStack Start + Nitro + Vite, a root route,
and the SSR entry, wired to the existing `src/db` client. Keep the existing Vitest
setup; add the framework's build/dev scripts to `package.json`.

**Routes (split, per the resolved ARCHITECTURE decision):**

- `/guias/$game/$monster` — general guide.
- `/guias/$game/$monster/$weapon` — weapon punish guide.

**Loaders (server-side, query Postgres by slug):**

- General loader: look up `monsters` by `(game, slug)`. Miss → `notFound()`. Fetch
  the monster's `clips` and its *published* `punish_guides` (to build weapon links).
- Weapon loader: resolve the monster, then the `punish_guides` row for
  `(monster_id, weapon_type)`. Enforce publish gating: a row whose `published_at`
  is NULL or `> now()` is treated as absent → `notFound()`. Fetch the guide's
  clips (monster-level clips plus any with this `punish_guide_id`).

**Rendering the compiled MDX.** 002 stored each body as an `@mdx-js/mdx`
`function-body` string (not a component). The route evaluates it at render time
with `run()` from `@mdx-js/mdx` against the React `jsx`/`jsxs`/`Fragment` runtime,
yielding an MDX content component, then renders it inside the page. A small,
shared MDX components map supplies `<Clip>`.

**`<Clip>` resolution (resolves the ARCHITECTURE open decision toward render-time
lookup).** The compiled body emits `<Clip slug="..." caption="..." />` with only
the slug — no URL. The loader builds a `slug → { url, caption }` map from the
`clips` rows and provides it to the `<Clip>` component, which renders a `<video
autoplay loop muted playsinline>` pointing at the CDN `url`. An unknown slug
renders a visible, non-fatal placeholder rather than throwing, so one bad
reference can't blank the page.

**Not-found + metadata.** `notFound()` drives an SSR 404 status and a minimal
Spanish not-found view at the root. Each route's `head`/meta derives `<title>` and
a description from the loaded monster/weapon.

### Confidence <!-- required -->

**Level:** Medium

**Rationale:** The data model, slug lookups, and publish-gating logic are
well-understood and low-risk. The uncertainty is concentrated in two integration
points: (1) first-time bootstrap of TanStack Start + Nitro + Vite alongside the
existing non-framework `src/` and Vitest config, and (2) evaluating a stored
`function-body` MDX string with `run()` during **SSR** and having it hydrate
cleanly on the client — `run()` needs the right jsx runtime on both sides, and the
`<Clip>` components map must be supplied identically server and client. These are
known-tricky in practice even though each piece is documented.

**Validate before proceeding:** Build a thin end-to-end render spike before
committing to the full route set — one hardcoded `function-body` string (e.g. the
Chatacabra `index.mdx` fixture compiled by 002) evaluated via `run()` and rendered
through a single TanStack Start route, including one `<Clip>`, verified to (a)
appear in server view-source and (b) hydrate without console errors. If `run()`
during SSR proves problematic, fall back to evaluating once on the server and
passing serializable rendered output — decide this in the spike, not mid-build.

### Key Decisions <!-- optional -->

- **Render-time `<Clip>` resolution over compile-time URL inlining.** Keeps the
  CDN base URL and clip layout out of the stored MDX, so re-pointing the CDN does
  not require re-ingest. Costs a per-page clips query and a components map, both
  cheap. This settles one of ARCHITECTURE's listed open decisions.
- **Enforce `published_at` at the loader.** A guide is live only when
  `published_at` is a past timestamp; NULL/future is hidden and 404s. Makes
  `published_at` a real gate (settling another open decision) without building any
  author/preview surface.
- **Split routes over a single-page weapon toggle.** Already resolved in
  ARCHITECTURE (2026-06-13) for authoring simplicity and SEO/shareability; 004
  implements it.
- **`notFound()` 404s over redirects.** Correct status codes matter for crawl and
  link unfurling even though full SEO is 008.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for queries, Playwright for core routes,
TypeScript as first defense):

- **Vitest — loaders/resolution (unit/integration against the test DB):**
  - General loader returns a known ingested monster; unknown slug → not-found.
  - Weapon loader returns a published guide; a NULL-`published_at` guide and a
    future-`published_at` guide both → not-found.
  - General page's weapon-link set includes only published guides.
  - `<Clip>` slug→URL map is built correctly from `clips` rows; unknown slug
    yields the placeholder path, not a throw.
- **Playwright — smoke on the core routes (the suite OVERVIEW names):**
  - General page (`/guias/wilds/chatacabra`) renders server-side: content present
    in initial HTML, a `<video>` with the expected CDN `url` and loop/muted
    attributes, and a link to each published weapon page.
  - A weapon page renders its content server-side.
  - A bogus monster slug returns HTTP 404 with the not-found view.
- **TypeScript** across routes, loaders, and the MDX components map.

Reuse the existing `test/fixtures/content/wilds/chatacabra` fixtures and the
ingest path to seed the DB for these tests rather than authoring new content
(that's 005-007).
