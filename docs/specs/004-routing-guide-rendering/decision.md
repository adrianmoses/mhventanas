# Decision Record: Routing + Guide Rendering

| Field | Value |
|---|---|
| id | 004 |
| status | implemented |
| created | 2026-06-14 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

Features 001–003 built the content supply chain (schema, MDX ingest, media hosting) but left the
repo a bare data-ingest backend: no web framework, no routes, no app entry. 004 is the read half
of the v1 vertical slice and bootstraps the entire user-facing application for the first time.

Two things shaped the work beyond the spec:

1. **The installed TanStack Start (1.168) builds with Vite and emits a fetch handler by default,
   not a runnable server.** OVERVIEW/ARCHITECTURE describe Nitro as the server runtime; in this
   generation Start no longer bundles Nitro automatically — a bare `vite build` produces
   `dist/server/server.js` (a Web `fetch` handler with no port binding). Adding the `nitro/vite`
   plugin (Nitro v3) restores the expected Node server output at `.output/server/index.mjs`,
   started with `node .output/server/index.mjs`. This was discovered during the Phase 0 spike.
2. **The spec rated confidence Medium and mandated a render spike first** — specifically to prove
   that a stored `@mdx-js/mdx` `function-body` string could be evaluated during SSR and hydrate
   cleanly. The spike was run before any real route work and resolved that risk (see Decision).

The DB was already running locally (001 docker-compose); the existing Chatacabra fixtures and the
programmatic `ingest()` entry point (002) were reused to seed both the manual verification and the
automated tests, so no new content was authored (that is 005–007).

## Decision <!-- required -->

Build the app as a TanStack Start (Vite-native) project with everything under `src/app/`:

- **Split routes** `/guias/$game/$monster` and `/guias/$game/$monster/$weapon` (per the
  ARCHITECTURE 2026-06-13 resolution), plus a minimal `/` landing and a Spanish `notFound` view.
- **Server-only loaders via `createServerFn`.** TanStack Start loaders run isomorphically (server
  for SSR, client for navigations), so DB access is wrapped in `createServerFn` handlers. The
  postgres client therefore never enters the browser bundle (verified: the client build has no
  `queries` chunk). The query logic itself lives in plain, unit-testable functions in
  `src/app/loaders/queries.ts`.
- **Render stored MDX with `runSync`** (`src/app/mdx/run-content.ts`) against the production React
  jsx runtime, on both server and client from the identical stored string, so SSR and hydration
  produce identical markup. `<Clip>` is injected through the content component's `components` prop
  (the compiled body has no `providerImportSource`).
- **Render-time `<Clip>` resolution.** The loader builds a `slug → {url, caption}` map from the
  `clips` table and provides it via React context; `<Clip>` renders an autoplay/loop/muted/inline
  `<video>` at the CDN URL, with a non-fatal placeholder for an unknown slug.
- **Enforce `published_at` at the loader.** A guide is live only when `published_at` is set and
  `<= now`; NULL and future timestamps both 404 and are dropped from the general page's weapon
  links — a single SQL filter (`isNotNull AND lte(now)`) is the whole gate.

---

## Alternatives Considered <!-- required -->

### Evaluating the stored function-body during SSR

**Option A — `runSync` on both server and client from the stored string.**
- Pros: server and client evaluate identical inputs → deterministic, clean hydration; loader
  payload stays serializable (just the string + clip map); interactive `<video>` on the client.
- Cons: `runSync` uses `new Function` (eval) inside the SSR server bundle — had to be proven safe.

**Option B — render once on the server (`renderToStaticMarkup`) and ship HTML via
`dangerouslySetInnerHTML`.**
- Pros: avoids any client-side eval; sidesteps Nitro/bundler eval concerns.
- Cons: loses client reconciliation of the MDX subtree; clunkier; the spec flagged it only as a
  fallback.

**Chosen:** A. The Phase 0 spike compiled the real Chatacabra fixture, evaluated it via `runSync`
in a route, and confirmed the prose + `<video>` appear in production-build SSR HTML and hydrate
without console errors. The fallback was never needed.

### `<Clip>` URL resolution (a listed ARCHITECTURE open decision)

**Option A — resolve at render time** from the `clips` table by slug.
- Pros: CDN base URL / key layout stay out of the stored MDX; re-pointing the CDN needs no
  re-ingest. Cost is one cheap per-page clips query.
- Cons: a small amount of render-time plumbing (context + map).

**Option B — inline the URL at compile time** into the stored body.
- Pros: no render-time lookup.
- Cons: bakes the CDN host into the DB; a CDN move forces a full re-ingest. Also impossible
  without changing 002, which intentionally stores slug-only `<Clip>` references.

**Chosen:** A. It matches what 002 already stored and keeps content rebuildable/CDN-agnostic.

### Where DB access lives relative to isomorphic loaders

**Option A — `createServerFn` wrapping plain query functions.**
- Pros: guaranteed server-only (handler + its imports stripped from the client bundle); the query
  functions stay directly callable in Vitest with no router/RPC boot.
- Cons: a thin wrapper per route.

**Option B — query the DB directly inside the route `loader`.**
- Pros: less code.
- Cons: isomorphic loaders would pull the postgres client into the browser bundle — broken.

**Chosen:** A.

### Production serve command

**Option A — add the `nitro/vite` plugin** to compile a runnable Node server (`.output/server/index.mjs`).
- Pros: standard `node .output/server/index.mjs` run command (reads `PORT`/`DATABASE_URL`); hosts
  on any plain Node service instance; no toolchain at runtime; matches the spec's original intent.
- Cons: one extra dependency (`nitro`).

**Option B — `vite preview`** on the default fetch-handler build.
- Pros: zero extra deps.
- Cons: Vite documents `preview` as not-for-production; needs the Vite toolchain at runtime; not a
  hardened server.

**Option C — hand-write a Node adapter** around the exported fetch handler.
- Pros: no Nitro.
- Cons: bespoke req/res↔Fetch glue and static-asset serving to maintain.

**Chosen:** A. `start` is `node .output/server/index.mjs`; the Playwright suite runs against that
same artifact. The specific hosting platform remains out of scope (spec/ARCHITECTURE non-goal).

---

## Tradeoffs <!-- required -->

- **`runSync` eval on every render.** Chosen for hydration correctness and simplicity over caching
  a compiled component. The MDX bodies are small and the eval is cheap; revisit only if profiling
  says so.
- **A per-page clips query** (render-time resolution) is the price of keeping CDN URLs out of the
  stored MDX. Accepted deliberately.
- **One extra dependency (`nitro`)** to get the Node server output, in exchange for a standard
  `node .output/server/index.mjs` deploy artifact. The hosting platform itself is still out of
  scope.
- **`Route.useLoaderData()` is annotated with the loader's data type** at the call site because
  full type inference through `createServerFn` did not flow to `useLoaderData` in this version.
  The annotation restores type safety; it is a minor ergonomic cost, not a correctness one.
- **Structural + minimal CSS only.** Rich components (timeline bar, move cards, stat block) are
  deferred to 005–007 per the spec, so these pages are intentionally plain.

---

### Spec Divergence <!-- optional -->

| Spec Said | What Was Built | Reason |
|---|---|---|
| Nitro as the server runtime (`node .output/server/index.mjs`) | Same run command, but Nitro is added explicitly via the `nitro/vite` plugin rather than bundled by Start | This Start generation no longer ships Nitro by default (bare build = a fetch handler). Adding the plugin restores the exact `.output/server/index.mjs` the spec assumed. |
| `run()` with a possible server-render-once fallback | `runSync` on both sides; no fallback | The spike proved both-sides eval hydrates cleanly, making the fallback unnecessary. |

All other acceptance criteria were implemented as specified.

---

## Spec Gaps Exposed <!-- optional -->

- **OVERVIEW/ARCHITECTURE name Nitro as the server runtime.** Still accurate in outcome, but the
  mechanism changed: Start builds with Vite and only emits a Node server when the `nitro/vite`
  plugin is added. ARCHITECTURE was updated to reflect this (Vite build + Nitro server output).
- **ARCHITECTURE open decisions now resolved by this feature:** clip reference resolution
  (render-time) and whether `published_at` gates visibility (it does). Worth folding back into the
  ARCHITECTURE "Open Decisions" list as resolved.
- **`published_at` semantics confirmed:** it is a real publish gate, not display-only — resolves
  the matching OVERVIEW open question.

---

## Test Evidence <!-- required -->

Vitest unit/integration suite (loaders, publish-gating matrix incl. future-dated case, clip-map
construction, MDX render, `<Clip>` placeholder) plus the prior 001–003 suites — full run:

```
 Test Files  13 passed (13)
      Tests  38 passed (38)
   Duration  10.68s
```

Playwright smoke on the core routes (production build + Nitro Node server,
`node .output/server/index.mjs`, against the seeded test DB):
SSR content present in raw HTML, published-only weapon links, clean hydration (no React/page
errors; the fake `cdn.test` resource-load failure is filtered), and correct 404s:

```
Running 5 tests using 5 workers
  ✓ general page renders content server-side with only published weapon links
  ✓ general page hydrates cleanly with a working <video>
  ✓ published weapon page renders content server-side
  ✓ unpublished weapon page returns 404
  ✓ unknown monster returns 404 with the Spanish not-found view
  5 passed (7.6s)
```

TypeScript (strict, NodeNext, verbatimModuleSyntax):

```
> tsc --noEmit
typecheck: OK (no errors)
```

Manual verification against the live preview server (dev DB seeded with the fixture) confirmed the
HTTP status matrix and SSR markup:

```
200  /guias/wilds/chatacabra            (prose + <video> at the CDN url + caption; links longsword only)
200  /guias/wilds/chatacabra/longsword  (published)
404  /guias/wilds/chatacabra/greatsword (unpublished → gated)
404  /guias/wilds/bogus                 (Spanish "Página no encontrada")
```
