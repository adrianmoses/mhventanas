# Spec: Cuaderno de Caza (hunt log)

| Field | Value |
|---|---|
| id | 009 |
| status | approved |
| created | 2026-09-27 |

---

## Why <!-- required -->

The guides teach punish windows in the abstract: which monster actions open a window and how
Longsword or Greatsword should respond. They cannot tell the owner whether that practice is
actually landing in real hunts. The cuaderno closes that loop: after each hunt, the owner records
what hit them, why, how long it took, and one thing to fix next time. Over many entries the
cuaderno surfaces patterns — the cause that keeps recurring, whether clear times on a monster are
trending down, which goals are still open.

This feature exists because improvement needs a record of your own hunts, not just reference
content. The mockup's header copy states it directly: *"El cuaderno cuenta qué te golpea más,
cuáles son tus mejores tiempos y qué quieres corregir la próxima vez."*

### Consumer Impact <!-- required -->

- **Owner (author) — primary.** Logs hunts across any of the 14 weapons, edits or deletes them,
  and reads stats and trends. Writing requires logging in with a single owner secret.
- **Visitors — secondary, read-only.** Can browse the owner's cuaderno (hub, entries, per-monster
  history) as public, owner-authored content. They cannot write, and see no edit/delete controls.
  This is *not* UGC: there is still exactly one author, so the OVERVIEW non-goal "no user
  accounts, comments, forums, or UGC" holds.

### Roadmap Fit <!-- required -->

Depends only on 001 (Postgres + Drizzle migrations) and 004 (TanStack Start app, SSR routes,
Nitro build). It is independent of the guide content (005-007) and of 008 — deliberately
**no guide integration in v1**. It introduces two firsts for the app that later features may
reuse: a server-side **write path** (TanStack Start server functions) and **session handling**.

It also introduces the first Postgres data that is **not rebuildable from git**, which amends the
ARCHITECTURE constraint "Postgres is always rebuildable from MDX via re-ingest" (see Approach).

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

**Public reads (no login)**

- [ ] `/cuaderno` server-renders the hub from the mockup: summary stats (cacerías, % completadas,
      tiempo medio, desmayos por caza), *Objetivos pendientes* (latest "próxima vez" per monster,
      up to 4), *Por qué te golpean* (cause frequency bars), the *Por monstruo* table (cacerías,
      mejor, último, desmayos/caza, arma habitual), and the entry list.
- [ ] The hub's entry list filters by monster, weapon, and free-text search; filters live in the
      URL query string (`?monstruo=&arma=&q=`) so filtered views are linkable and SSR-rendered.
      Summary stats and cause bars reflect the filtered set, as in the mockup.
- [ ] Each entry expands to show all recorded fields (build, me golpeó, desmayo, señales y
      aperturas, debilidades y partes, faltó, comida y trampas, bien, error principal, próxima vez,
      cause tags).
- [ ] Clicking a row in *Por monstruo* navigates to `/cuaderno/monstruo/:slug`, which shows that
      monster's entries, its stats, and the clear-time trend chart (rendered when ≥ 2 completed
      hunts with a time), with the "más rápido/lento que tu primera caza" delta. An unknown slug
      404s.
- [ ] With no hunts logged, each section shows its empty-state copy from the mockup (no sample
      entries).
- [ ] Visitors see no *Editar*, *Repetir*, *Borrar*, or *Salir* controls. The hub and monster
      page headers show visitors an *Entrar* link (returning to the current page after login)
      and *+ Registrar cacería*, which goes through `/cuaderno/entrar` to the form.
      *(Amended 2026-09-27: the login page needed a visible entry point.)*

**Owner writes (login required)**

- [ ] `/cuaderno/entrar` accepts the owner secret; on success a signed, httpOnly, `SameSite=Lax`,
      `Secure` (in prod) session cookie is set and the owner is redirected back. A wrong secret
      shows an error and sets no cookie. A *Salir* action clears the session.
- [ ] `/cuaderno/nueva` and `/cuaderno/:id/editar` render the full mockup form (fecha, monstruo,
      rango, variante, arma, tiempo mm:ss, desmayos 0-3, resultado, build, golpes, causas, causa
      del desmayo, señales, debilidades, objetos que faltaron, comida y trampas, bien, error,
      próxima vez). Unauthenticated requests redirect to `/cuaderno/entrar`.
- [ ] Saving validates server-side (monster required; time as `mm:ss`; carts 0-3; weapon, rank,
      result, and causes from their closed sets) and shows the mockup's Spanish error copy on
      failure. On success, it redirects to the hub with the saved entry expanded.
- [ ] *Repetir contra este monstruo* opens `/cuaderno/nueva` pre-filled with monster, rank,
      variant, weapon, and build from the source entry.
- [ ] *Borrar* asks for inline confirmation, then deletes the entry.
- [ ] Every mutating server function checks the session itself; calling one without a valid
      session returns 401 and changes nothing (route-level redirects are not the only guard).
- [ ] Monster suggestions in the form come from monster names already in the log (free text
      remains allowed).

### Non-Goals <!-- required -->

- No multi-user accounts, registration, sharing, or per-visitor notebooks — one owner only.
- No guide integration in v1: no links from entries to `/guias/...`, no guide-page CTA, no FK
  from hunts to the `monsters` table.
- No structured build data — build stays free text (consistent with the OVERVIEW "no build
  optimizers" non-goal).
- No import of the mockup's localStorage data or sample entries.
- No offline/PWA mode, and no client-side-only storage.
- No changes to the guides' `weapon_type` enum; the log's 14-weapon list is separate.

### Open Questions <!-- optional -->

- **Resolved (2026-09-27): Indexing.** Public cuaderno pages (`/cuaderno`,
  `/cuaderno/monstruo/:slug`) are indexable. The login and form routes (`/cuaderno/entrar`,
  `/cuaderno/nueva`, `/cuaderno/:id/editar`) are `noindex`.
- **Resolved (2026-09-27): Backups.** The `pnpm hunts:export` JSON dump is the backup mechanism
  for v1. Host-level backups are optional and follow the Postgres-host decision.

---

## How <!-- required -->

### Approach <!-- required -->

**1. Data model (Drizzle migration).** Add one table plus enums in `src/db/schema.ts`:

- `hunt_weapon` enum — 14 slugs (`greatsword`, `longsword`, `sword-and-shield`, `dual-blades`,
  `hammer`, `hunting-horn`, `lance`, `gunlance`, `switch-axe`, `charge-blade`, `insect-glaive`,
  `bow`, `light-bowgun`, `heavy-bowgun`) with Spanish labels in a new `src/app/cuaderno/labels.ts`
  (reusing the glossary: Espada Larga, Gran Espada, …). Kept separate from `weapon_type`.
- `hunt_rank` enum (`bajo`, `alto`, `maestro`), `hunt_result` enum (`ok`, `fail`, `quit`),
  `hunt_cause` enum (`tell`, `pos`, `greed`, `dodge`, `stamina`, `heal`, `wind`, `other`).
- `hunts (id, hunted_on date, monster_name, monster_slug, rank, variant, weapon, time_seconds
  NULL, carts smallint CHECK 0-3, result, build, hits, causes hunt_cause[], cart_cause, learned,
  weaknesses, missing_items, prep, went_well, main_error, next_goal, created_at, updated_at)`.
  Free-text fields are nullable `text`. `monster_slug` is derived from `monster_name` on save
  (lowercase, strip accents, hyphenate) and indexed; it drives `/cuaderno/monstruo/:slug`.

**2. Auth (owner-only writes).** Two env vars: `CUADERNO_OWNER_SECRET` (the login secret) and
`SESSION_SECRET` (HMAC key). `src/app/cuaderno/session.ts` provides `createSession`,
`readSession`, `requireOwner`. The cookie is an HMAC-signed payload with an expiry (30 days),
compared in constant time. No new auth library unless the spike shows the framework's built-in
session helper is simpler. A route `beforeLoad` redirects unauthenticated form visits to
`/cuaderno/entrar?next=…`; **each mutating server function calls `requireOwner()` independently**.
The hub's loader returns an `isOwner` flag so owner controls render only when logged in.

**3. Server functions + queries** (`src/app/cuaderno/`):

- Reads: `listHunts(filters)`, `getHunt(id)`, `listHuntsByMonster(slug)`, `monsterNames()`.
- Aggregations (summary, cause counts, per-monster table, pending goals, trend points) are pure
  TypeScript functions over the hunt rows in `stats.ts`, so they are unit-testable and shared by
  both hub and monster pages. At personal-log scale (hundreds of rows) computing them in the
  loader is fine; there is no need for SQL aggregates.
- Writes: `createHunt`, `updateHunt`, `deleteHunt`, validated with a shared zod schema (`zod` is
  already a dependency) that also parses `mm:ss` → seconds.

**4. Routes** (file-based, alongside the existing `guias.*` routes):

| Route | Access | Content |
|---|---|---|
| `cuaderno.index.tsx` | public | Hub: stats, goals, causes, per-monster table, filters, entries |
| `cuaderno.monstruo.$slug.tsx` | public | Per-monster stats, trend chart, entries |
| `cuaderno.nueva.tsx` | owner | Form (supports `?repetir=:id` pre-fill) |
| `cuaderno.$id.editar.tsx` | owner | Form pre-filled for edit |
| `cuaderno.entrar.tsx` | public | Login form; `salir` action clears the session |

**5. UI components.** Port the mockup into React components: `HuntForm`, `SummaryStats`,
`GoalsPanel`, `CauseBars`, `MonsterTable`, `TimeTrendChart` (inline SVG, as in the mockup),
`EntryList`/`EntryCard` (expand/collapse; edit/repeat/delete inline confirm when owner). The
mockup's styling (Alegreya SC / Alegreya Sans / IBM Plex Mono, single-level cards) is the visual
reference; reconcile its tokens with `src/app/styles.css` rather than adding a second stylesheet
system. Add a *Cuaderno* link to the root nav.

**6. Architecture + backup.** Update `ARCHITECTURE.md`: add the `hunts` table to the schema list,
the `/cuaderno/*` routes to the component map, and amend the Key Constraint to say that
guide tables are rebuildable from git while `hunts` is primary data that must be backed up. Add a
`pnpm hunts:export` script that writes all hunts as JSON. Ingest must never touch `hunts`.

### Confidence <!-- required -->

**Level:** Medium

**Rationale:** The data model, pages, and stats are straightforward, and the mockup already pins
the behaviour and copy. The uncertainty is that this is the app's **first write path and first
session handling**: how TanStack Start server functions read and set cookies, how redirects work
from `beforeLoad`, and whether all of that behaves the same in `vite dev` and in the Nitro
production build (`node .output/server/index.mjs`).

**Validate before proceeding:** A spike: one server function behind `requireOwner()` that
inserts a row, plus the login route that sets the cookie. Verify it end-to-end in both dev and the
built Nitro server (cookie set/read, 401 without a session, redirect to `/cuaderno/entrar`).
Choose between hand-rolled HMAC cookies and the framework's session helper based on the result.

**Spike result (2026-09-27): passed.** Validated in both `vite dev` and the Nitro build
(`node .output/server/index.mjs`, `NODE_ENV=production`): login sets an httpOnly/`SameSite=Lax`
cookie (`Secure` in prod); SSR loaders see the session; the protected write succeeds for the
owner and returns 401 for anonymous calls, including a direct POST replay without a cookie;
tampered cookies, wrong secrets, and logout all fall back to not-owner; `?next=` cannot leave
`/cuaderno`. Decision: use Start's built-in sealed session (`useSession`/`unsealSession`) rather
than hand-rolled HMAC. One finding: `getSession` sets a cookie on every anonymous request, so
`isOwner()` reads the cookie and unseals it read-only. Confidence is now **High**.

### Key Decisions <!-- optional -->

- **Postgres over browser storage** — the log is the owner's durable record and is publicly
  readable, so it must be server-side. Trade-off: first non-rebuildable data, which needs a backup
  story.
- **Public reads, gated writes** — visitors can learn from the owner's log. Only forms and
  mutations need auth, which keeps the auth surface to one secret and one cookie.
- **Separate 14-weapon enum** — the log covers any weapon without widening guide routing, which
  stays LS/GS.
- **Free-text monster with a derived slug, no FK to `monsters`** — the log covers monsters that
  have no guide. Linking to guides is deferred.
- **Split pages over the mockup's single page** — the long form gets its own page, and
  per-monster history gets a linkable URL.
- **Aggregations in TypeScript, not SQL** — at this data size it is simpler and easier to test.

### Testing Approach <!-- required -->

Per the OVERVIEW testing suite (Vitest + Playwright, TypeScript first):

- **Vitest (unit):**
  - `mm:ss` parse/format, including invalid inputs (`18:4`, `1:60`, empty → null).
  - Monster slugify (accents, spaces, casing — e.g. "Rey Dau" → `rey-dau`).
  - `stats.ts`: summary over a filtered set; % completed; average time ignoring failed/untimed
    hunts; cause counts; per-monster best/last/habitual weapon; pending goals (latest per monster,
    max 4); trend delta sign.
  - zod hunt schema accepts a full mockup sample and rejects out-of-set enum values and carts > 3.
  - Session sign/verify: a valid cookie passes; tampered, expired, and wrong-key cookies fail.
- **Vitest (DB):** create/update/delete hunt queries against the docker Postgres; ingest leaves
  `hunts` untouched.
- **Playwright (E2E):**
  - A visitor sees the hub and a monster page, with no write controls; `/cuaderno/nueva` redirects
    to login.
  - The owner logs in, logs a hunt, sees it on the hub and in the stats, edits it, uses
    *Repetir*, deletes it, and logs out.
  - A direct POST to a mutation without the cookie returns 401.
  - Filters in the query string render the filtered view on SSR (reload keeps the filter).
