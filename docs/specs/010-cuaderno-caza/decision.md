# Decision Record: Cuaderno de Caza (hunt log)

| Field | Value |
|---|---|
| id | 010 |
| status | implemented |
| created | 2026-09-27 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

Unlike 001-008, the cuaderno was not in the original roadmap. The owner brought a standalone
HTML mockup (`docs/mockup/cuaderno-caza.html`): a single page with a hunt form, summary stats,
pending goals, a hit-cause chart, a per-monster table with a time-trend chart, and a filterable
entry list. It persisted to `localStorage` (or an artifact DB) and listed all 14 weapons. Spec
discovery resolved three conflicts between that mockup and OVERVIEW. The log is the **owner's
alone**: it is stored in Postgres, reads are public, and only writes need a login. It accepts
**all 14 weapons**, but only in the log. The mockup is **split into pages**, and there is **no
guide integration** in v1.

Several things shaped the work beyond the spec:

1. **This is the app's first write path and first session handling.** The spec therefore set
   confidence to Medium and required a spike first. The spike passed in both `vite dev` and
   the Nitro build (11/11 checks: 401 for anonymous and replayed writes, tampered cookie,
   wrong secret, logout, open-redirect guard). It settled the session mechanism, and it also
   surfaced finding 2 below.
2. **`getSession` has a side effect.** Start's `getSession` creates an empty session, and sets a
   cookie for it, on *every* request that has none. Using it for the owner check would have put
   a cookie on every public, indexable cuaderno page.
3. **A false alarm on the `Secure` flag.** The spec's "`Secure` in prod" was first written as
   `process.env.NODE_ENV === "production"`. `pnpm start` doesn't set `NODE_ENV`, and a probe
   seemed to show the cookie without `Secure`. That probe had actually hit a leftover dev server
   on the same port. Re-testing the built server showed Vite inlines `NODE_ENV` as `"production"`
   at build time, so the original code already sent `Secure`. The check was rewritten as
   `!import.meta.env.DEV` anyway, because it states the intent directly without relying on
   build-time inlining. An E2E assertion now pins the flag either way.
4. **Renumbered from 009 to 010.** The feature was specced and built as 009, but "009 homepage
   monster index + site navigation" merged to main first (PR #8). The branch was rebased onto
   main and everything was renumbered to 010. #8 also added the site header, which now carries
   the *Cuaderno* link.
5. **The owner redirected scope twice after approval.** Public pages were made indexable, with a
   JSON export as the backup. After the first build, the owner asked for visible *Entrar* and
   *+ Registrar cacería* links for visitors, because the login page had no entry point. The
   spec's acceptance criterion was amended in place for this, with a note.

## Decision <!-- required -->

Build the cuaderno as five TanStack Start routes over one new Postgres table. Reads are public
and SSR-rendered. Writes are gated by a single owner secret and a sealed session cookie.

- **Data:** a `hunts` table (migration `0001_cuaderno_hunts`) with its own enums: `hunt_weapon`
  (14 values, separate from the guides' `weapon_type`), `hunt_rank`, `hunt_result`, and
  `hunt_cause[]`. It has DB `CHECK`s on carts (0-3) and non-negative time. `monster_name` is
  free text, and `monster_slug` is derived from it on save, indexed, and used in the URL. There
  is no FK to `monsters`. `hunts` is primary data: ingest never touches it (tested), and
  `pnpm hunts:export` dumps it as JSON.
- **Routes:**
  - `/cuaderno` (hub) and `/cuaderno/monstruo/:slug` are public and indexable.
  - `/cuaderno/nueva` (with `?repetir=:id`) and `/cuaderno/:id/editar` are owner-only and
    `noindex`.
  - `/cuaderno/entrar` is the login page and is `noindex`.
  - Hub filters live in the query string (`?monstruo=<slug>&arma=&q=`). They work through a GET
    form before hydration.
- **Auth:**
  - Start's built-in sealed session (`useSession`/`unsealSession`, iron-style
    encrypted and signed cookie, keyed by `SESSION_SECRET`, 30 days). Cookie flags are
    `HttpOnly`, `SameSite=Lax`, and `Secure` whenever `!import.meta.env.DEV` (every production
    build).
  - The login compares a sha256 of the submitted secret with a sha256 of
    `CUADERNO_OWNER_SECRET` using `timingSafeEqual`.
  - `isOwner()` is **read-only**: it reads the cookie and unseals it, and never calls
    `getSession`.
  - **Every mutating server function calls `requireOwner()` itself.** The form routes'
    `beforeLoad` redirect exists only for UX.
  - `?next=` is restricted to `/cuaderno…`.
  - The session header transport is disabled, so the session is accepted only from the cookie.
- **Logic:** all aggregation (summary, cause counts, pending goals, per-monster rows, trend) is
  pure TypeScript in `stats.ts` over the full row set. One zod schema (`validate.ts`) parses the
  form into table values, including `mm:ss` → seconds and blank → `NULL`, with the mockup's
  Spanish error messages.
- **UI:** the mockup is ported to React components on the site's existing tokens, scoped under
  `.cuaderno` / `cz-*`.

---

## Alternatives Considered <!-- required -->

### Where the log lives

**Option A:** Browser storage (`localStorage`/IndexedDB), one notebook per visitor.
- Pros: no server writes and no auth; the OVERVIEW "no accounts/UGC" non-goal is untouched.
- Cons: the log is tied to one device and lost when site data is cleared; it can't be shared or
  read by others.

**Option B:** Postgres, owner-only writes.
- Pros: durable; readable by visitors; one author, so still not UGC.
- Cons: this is the first write path and first auth, and the first data not rebuildable from git.

**Option C:** Multi-user accounts.
- Pros: every visitor gets a durable log.
- Cons: reverses an OVERVIEW non-goal and needs registration, password handling, and per-user data.

**Chosen:** B, the owner's choice in discovery. The auth surface is kept to one secret and one cookie.

### Session mechanism

**Option A:** Hand-rolled HMAC-signed cookie (what the spec proposed).
- Pros: small and fully understood; no framework coupling.
- Cons: expiry, encoding, and constant-time verification have to be written and tested by hand.

**Option B:** Start's built-in sealed session.
- Pros: encrypted and signed, with expiry built in; the spike verified it in dev and prod.
- Cons: `getSession` sets a cookie as a side effect (worked around below), and there is framework
  coupling on a beta Nitro.

**Chosen:** B. The spike showed it works in both runtimes. The side effect is contained by using
`getCookie` + `unsealSession` for the owner check.

### Deciding the `Secure` flag

**Option A:** `process.env.NODE_ENV === "production"`.
- Pros: conventional; works today, because Vite inlines `NODE_ENV` as `"production"` in the
  build (verified: the build compiles it to `secure: true`, and the served cookie carries
  `Secure` even though `pnpm start` sets no `NODE_ENV`).
- Cons: correctness depends on build-time inlining that is invisible when reading the source.
  It looks like a runtime check that `pnpm start` would fail, which is exactly the
  misreading that happened here.

**Option B:** The request protocol (`https`).
- Pros: adapts per request.
- Cons: wrong behind a TLS-terminating proxy, which is the likely deploy shape.

**Option C:** Build-time `!import.meta.env.DEV`.
- Pros: every production build is `Secure` regardless of environment; dev over plain HTTP keeps
  working.
- Cons: a production build served over plain HTTP from a non-localhost host would lose the
  session. That is acceptable: the owner session should never travel over plain HTTP.

**Chosen:** C, although A was also correct. Both compile to `secure: true`, and C says what it
means. Browsers accept `Secure` cookies on `http://localhost`, so the E2E suite, which serves the
production build, can assert `secure: true`.

### Page structure

**Option A:** One page, like the mockup.
- Pros: a one-to-one port.
- Cons: a long form inline on the public page; per-monster history has no URL.

**Option B:** A hub plus separate form and per-monster pages.
- Pros: linkable monster pages; the form is owner-only on its own route.
- Cons: more routes.

**Chosen:** B (owner's choice). Clicking a per-monster row navigates to that monster's page rather
than filtering the hub, as the mockup did.

### Where aggregation happens

**Option A:** SQL aggregates per widget.
- Pros: scales to large tables.
- Cons: several queries, harder to unit-test, and the free-text search needs the same logic anyway.

**Option B:** Load all rows and compute in TypeScript.
- Pros: one query per page, pure testable functions, and simple accent-insensitive search over
  labels.
- Cons: linear in log size.

**Chosen:** B. A personal log is hundreds of rows; revisit only if that changes by orders of
magnitude.

### Monster identity

**Option A:** FK to `monsters`.
- Pros: canonical names; could link to guides later.
- Cons: the log must cover monsters that have no guide, and guide integration is a non-goal.

**Option B:** Free text with a derived slug.
- Pros: any monster; stable URLs; name spellings that differ in case or accents merge under
  one slug.
- Cons: typos create separate monsters.

**Chosen:** B. The form suggests names already in the log (datalist) to reduce typos. The table
shows the most recent spelling for each slug.

---

## Tradeoffs <!-- required -->

- **Single-secret auth, with no rate limiting on login.** Brute force is only impractical if the
  secret is long and random. The generated one is, but nothing enforces that for a custom one.
- **First non-rebuildable data.** The "Postgres is rebuildable from git" invariant now holds
  only for the guide tables. Backups depend on someone running `pnpm hunts:export`. Restore is
  manual, since there is no import script.
- **Framework-coupled session.** It depends on Start/h3 session semantics, including the
  `getSession` side effect. A framework upgrade could change them; the E2E suite is the guard.
- **Whole-table reads.** Every hub load reads every hunt. That is fine at personal scale, but
  not free.
- **Visual fidelity.** The page keeps the site's typography and palette rather than the
  mockup's Alegreya/green-gold look, and there is no dark mode, because the site has none. The
  cuaderno reads as part of the site, not as a separate tool.
- **Public reads of the owner's notes.** Everything logged, including build and mistakes, is
  public and indexable by design.

---

### Spec Divergence <!-- optional -->

| Spec Said | What Was Built | Reason |
|---|---|---|
| Hand-rolled HMAC cookie (`createSession`/`readSession`) unless the spike favoured the framework helper | Start's sealed session; `startOwnerSession`/`isOwner`/`requireOwner`/`endOwnerSession` | The spike favoured the built-in helper (the spec allowed this). |
| Owner check via the session helper | `isOwner()` = `getCookie` + `unsealSession`, read-only | `getSession` sets a cookie on every anonymous request; public pages must not. |
| Cookie `Secure` "in prod" | `Secure` whenever `!import.meta.env.DEV` | Matches the spec; expressed as a build-mode flag, not `NODE_ENV`, for clarity (see Context 3). Pinned by E2E. |
| Visitors see no *Registrar cacería* control | Visitors see *Entrar* and *+ Registrar cacería* (the latter routes through login); still no Editar/Repetir/Borrar/Salir | Owner request after the first build: the login page had no entry point. Spec criterion amended in place. |
| Add a *Cuaderno* link to the root nav | *Cuaderno* link in the site header (`__root.tsx`) | Matches. The site header arrived with 009 (homepage + navigation), which merged while this feature was in progress; the link was added to it on rebase. |
| Session sign/verify unit tests: valid, tampered, expired, wrong-key | Unit tests cover the secret check and `safeNext`. E2E covers valid, tampered, missing, and logged-out cookies, plus the 401 on replayed writes and the `Secure`/`HttpOnly`/`Lax` flags | Sealing needs a live request context, so the checks moved to E2E. **Expiry and a rotated `SESSION_SECRET` are not tested.** |
| Mockup styling as the "visual reference" | Site tokens, system fonts, `cz-*` classes in `styles.css`; no Google Fonts; no dark mode | The spec said to reconcile with `styles.css` rather than add a second system. |
| Entry expand/collapse (mockup: JS button) | `<details>/<summary>` | Works before hydration and without JS. |
| — (unspecified) | A shared `getFormData` read for the form routes is a public server fn | The data it returns is already public, so no auth is needed; writes remain gated. |

Everything else matches the spec: acceptance criteria, schema, routes, indexing, JSON export,
ARCHITECTURE/README updates, and all 14 weapons.

---

## Spec Gaps Exposed <!-- optional -->

- **OVERVIEW doesn't describe the cuaderno.** Product Summary, Target Consumer, and Job To Be
  Done still describe a guides-only site. The "no accounts / UGC" non-goal still holds (there is
  one author), but OVERVIEW should say so explicitly and name the owner as a second consumer.
  Candidate for an OVERVIEW revision.
- **No login rate limiting.** Nothing enforces secret strength or throttles `/cuaderno/entrar`.
  Candidate backlog item (B3).
- **Backup without restore.** `hunts:export` exists; there is no `hunts:import` and no schedule.
  This ties to the OVERVIEW open question on the Postgres host. Candidate backlog item (B4).
- **Deploy docs.** ARCHITECTURE's deploy note says the server "reads `PORT`/`DATABASE_URL`". It
  now also needs `CUADERNO_OWNER_SECRET` and `SESSION_SECRET`, and must be served over HTTPS for
  the owner session. README covers the env vars; the deploy note should too when the deploy
  target is chosen.
- **No local dev URL guard.** Dev (`vite dev`) intentionally sends a non-`Secure` cookie. Worth
  knowing if anyone ever exposes a dev server beyond localhost.

---

## Test Evidence <!-- required -->

`pnpm typecheck` passes. `pnpm build` succeeds.

Full Vitest run (`pnpm test`, 2026-09-27; 66 of the 115 tests are new in 010):

```
 Test Files  20 passed (20)
      Tests  115 passed (115)
   Start at  10:45:07
   Duration  14.89s (transform 238ms, setup 0ms, import 8.94s, tests 1.96s, environment 2ms)
```

010 unit + DB tests (`vitest run test/cuaderno --reporter=verbose`):

```
 ✓ test/cuaderno/queries.test.ts > hunt queries > inserts and reads back a hunt 42ms
 ✓ test/cuaderno/queries.test.ts > hunt queries > updates a hunt and reports missing ids 15ms
 ✓ test/cuaderno/queries.test.ts > hunt queries > deletes a hunt 11ms
 ✓ test/cuaderno/queries.test.ts > hunt queries > lists by monster slug and returns distinct monster names 14ms
 ✓ test/cuaderno/queries.test.ts > hunt queries > enforces the carts range in the database too 7ms
 ✓ test/cuaderno/queries.test.ts > hunt queries > is untouched by ingest 44ms
 ✓ test/cuaderno/queries.test.ts > exportHunts > dumps every hunt with all columns 13ms
 ✓ test/cuaderno/stats.test.ts > sortNewestFirst > orders by date desc, then id desc for same-day hunts 11ms
 ✓ test/cuaderno/stats.test.ts > filterHunts > filters by monster slug and weapon 0ms
 ✓ test/cuaderno/stats.test.ts > filterHunts > searches text fields case- and accent-insensitively 1ms
 ✓ test/cuaderno/stats.test.ts > filterHunts > searches cause and weapon labels 1ms
 ✓ test/cuaderno/stats.test.ts > summarize > computes the mockup's four stats 0ms
 ✓ test/cuaderno/stats.test.ts > summarize > averages time over completed, timed hunts only 0ms
 ✓ test/cuaderno/stats.test.ts > summarize > returns empty values for no hunts 0ms
 ✓ test/cuaderno/stats.test.ts > causeCounts > counts causes, most frequent first, ties in canonical order 0ms
 ✓ test/cuaderno/stats.test.ts > pendingGoals > keeps the latest goal per monster 0ms
 ✓ test/cuaderno/stats.test.ts > pendingGoals > skips hunts without a goal and caps at the limit 0ms
 ✓ test/cuaderno/stats.test.ts > monsterRows > builds the per-monster table, most-hunted first 0ms
 ✓ test/cuaderno/stats.test.ts > monsterRows > uses the most recent completed time for 'last' and ignores failed hunts 1ms
 ✓ test/cuaderno/stats.test.ts > monsterRows > picks the most-used weapon, breaking ties by most recent 0ms
 ✓ test/cuaderno/stats.test.ts > monsterRows > shows the most recent spelling of the monster name 0ms
 ✓ test/cuaderno/stats.test.ts > timeTrend > returns oldest→newest completed times and a negative delta when faster 0ms
 ✓ test/cuaderno/stats.test.ts > timeTrend > needs at least two completed, timed hunts 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > accepts a full mockup-style submission and maps it to table values 4ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > allows a blank time 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > dedupes causes 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects a malformed time with the mockup's message 1ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > requires a monster 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects a monster name with nothing sluggable 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects carts above 3 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects out-of-set values {"weapon":"sword"} 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects out-of-set values {"rank":"g"} 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects out-of-set values {"result":"win"} 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > rejects out-of-set values {"causes":["lag"]} 0ms
 ✓ test/cuaderno/validate.test.ts > huntInputSchema > accepts all 14 weapons 0ms
 ✓ test/cuaderno/auth.test.ts > checkOwnerSecret > accepts only the configured secret 2ms
 ✓ test/cuaderno/auth.test.ts > checkOwnerSecret > fails loudly when the secret is not configured 1ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "/cuaderno" → "/cuaderno" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "/cuaderno/nueva?repetir=3" → "/cuaderno/nueva?repetir=3" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "/cuaderno?q=x" → "/cuaderno?q=x" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "https://evil.example" → "/cuaderno" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "//evil.example/cuaderno" → "/cuaderno" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "/cuadernos-falsos" → "/cuaderno" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > "/guias/wilds/chatacabra" → "/cuaderno" 0ms
 ✓ test/cuaderno/auth.test.ts > safeNext > undefined → "/cuaderno" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > parses "18:40" 1ms
 ✓ test/cuaderno/format.test.ts > parseTime > parses "0:05" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > parses "120:00" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > parses " 9:59 " 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "18:4" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "1:60" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "18" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "a:bc" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "1234:00" 0ms
 ✓ test/cuaderno/format.test.ts > parseTime > rejects "-1:00" 0ms
 ✓ test/cuaderno/format.test.ts > formatTime > formats seconds as m:ss 0ms
 ✓ test/cuaderno/format.test.ts > formatTime > shows a dash when there is no time 0ms
 ✓ test/cuaderno/format.test.ts > formatTime > round-trips with parseTime 0ms
 ✓ test/cuaderno/format.test.ts > formatDate / formatDecimal > formats ISO dates day-first 0ms
 ✓ test/cuaderno/format.test.ts > formatDate / formatDecimal > uses a decimal comma 0ms
 ✓ test/cuaderno/format.test.ts > slugifyMonster > "Rey Dau" → "rey-dau" 0ms
 ✓ test/cuaderno/format.test.ts > slugifyMonster > "Rathalos" → "rathalos" 0ms
 ✓ test/cuaderno/format.test.ts > slugifyMonster > "  Gore Magala " → "gore-magala" 0ms
 ✓ test/cuaderno/format.test.ts > slugifyMonster > "Nu Udra (Arquetemplado)" → "nu-udra-arquetemplado" 0ms
 ✓ test/cuaderno/format.test.ts > slugifyMonster > "Jyuratodus Ácido" → "jyuratodus-acido" 0ms
 Test Files  5 passed (5)
      Tests  66 passed (66)
```

Playwright against the production Nitro build (`pnpm test:e2e --reporter=list`; 8 of 13 new in 010):

```
  ✓ [chromium] › test/e2e/guides.spec.ts:60:1 › unknown monster returns 404 with the Spanish not-found view (205ms)
  ✓ [chromium] › test/e2e/guides.spec.ts:55:1 › unpublished weapon page returns 404 (224ms)
  ✓ [chromium] › test/e2e/guides.spec.ts:8:1 › general page renders content server-side with only published weapon links (253ms)
  ✓ [chromium] › test/e2e/guides.spec.ts:48:1 › published weapon page renders content server-side (236ms)
  ✓ [chromium] › test/e2e/guides.spec.ts:23:1 › general page hydrates cleanly with a working <video> (307ms)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:39:1 › visitor sees the empty hub with login links but no owner controls or cookies (1.4s)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:57:1 › visitor's Registrar link goes through login to the form (900ms)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:66:1 › form routes send visitors to the login page and are noindex (659ms)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:73:1 › wrong secret is rejected without a session (754ms)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:81:1 › owner logs, reviews, edits, repeats and deletes hunts (5.7s)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:156:1 › filters in the query string are server-rendered (1.1s)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:171:1 › unknown monster page 404s (11ms)
  ✓ [chromium] › test/e2e/cuaderno.spec.ts:175:1 › writes without a valid session return 401 and change nothing (874ms)
  13 passed (17.7s)
```

`Secure` flag: manual probes of the built server started exactly as `pnpm start` does (no
`NODE_ENV`). Both the original `NODE_ENV` check and the final `!import.meta.env.DEV` check compile
to `secure: true`, and both send:

```
SET-COOKIE: cuaderno=<sealed>; Path=/; Expires=Tue, 27 Oct 2026 08:47:07 GMT; HttpOnly; Secure; SameSite=Lax
```

This is now asserted in `cuaderno.spec.ts` ("owner logs, reviews…":
`{ secure: true, httpOnly: true, sameSite: "Lax" }`).
