# Decision Record: Fly.io Deploy Setup (Neon Postgres)

| Field | Value |
|---|---|
| id | B5 |
| status | implemented |
| created | 2026-09-27 |
| spec | — (backlog item; scope in [ROADMAP](../ROADMAP.md) B5 and [ARCHITECTURE](../ARCHITECTURE.md)) |

---

## Context <!-- required -->

The hosting decisions were settled on 2026-09-27 (see ARCHITECTURE, Open Decisions): **Fly.io**
runs the Nitro Node server as a long-lived process, **Neon** hosts Postgres, and **R2** keeps
serving clips (003). B5 turns that into a deployable artifact. The open question it had to close
was *when ingest runs*: baked into the build, or as a deploy step against the live DB.

Verified during implementation:
- The Nitro output (`.output/`, ~2 MB) is self-contained — its deps are bundled into
  `.output/server/_libs` — so the server needs no `node_modules`.
- The migrate + ingest CLIs need `tsx` and `dotenv` (previously devDependencies) plus
  drizzle/postgres/mdx/gray-matter/zod/unist-util-visit (already dependencies).
  `mdast-util-mdx-jsx` and `mdast` are type-only imports.
- Nitro listens on all interfaces when `HOST` is unset, which Fly's proxy needs.
- postgres.js forwards unknown connection-URL query params as server startup parameters. Neon's
  default string includes `channel_binding=require`, which fails with
  `unrecognized configuration parameter "channel_binding"`. `sslmode` is understood.

## Decision <!-- required -->

- **`Dockerfile`** (multi-stage, `node:24-slim`, pnpm 9.15.1 via corepack): a build stage does a
  full install and `pnpm build`; a prod-deps stage does `pnpm install --prod`; the final image
  holds `.output/`, prod `node_modules`, and `src/`, `content/`, `drizzle/`. Runs as `node` on
  `PORT=3000`.
- **Release step:** new `npm run release` script (`tsx src/db/migrate.ts && tsx
  src/ingest/index.ts`), run by Fly's `release_command` in a temporary machine from the new
  image before it takes traffic. `tsx` and `dotenv` moved to `dependencies` so a `--prod`
  install carries them.
- **`fly.toml`:** `[[services]]` on 3000 with 80→443 redirect, `auto_stop_machines = "stop"`,
  `min_machines_running = 0`, and a **TCP-only** health check.
- **`src/db/client.ts`:** the pool now sets `idle_timeout: 60`.
- **README "Despliegue":** first-time setup (Neon direct string without `channel_binding`, R2
  public URL as `CDN_BASE_URL`, `fly launch --no-deploy`, `fly secrets set`, `fly deploy`) and
  local image testing.

---

## Alternatives Considered <!-- required -->

### When ingest runs

**Option A — deploy step (`release_command`) against the live DB.**
- Pros: content and schema land atomically with the code that reads them; a failed migrate or
  ingest aborts the deploy and the old release keeps serving; no DB access needed at build time.
- Cons: the runtime image must carry sources, content and the release deps.

**Option B — ingest during `docker build`.** Needs `DATABASE_URL` as a build secret, couples
builds to a live DB, and a remote builder then writes to production before the deploy is known
to succeed.

**Option C — separate CI job (GitHub Actions) before `fly deploy`.** Works, but splits one deploy
across two systems and needs Neon credentials in CI too.

**Chosen:** A.

### Runtime image contents

**Option A — prod `node_modules` + sources alongside `.output/`** (456 MB image).
**Option B — full `node_modules` (dev deps included).** Simpler, larger, ships vite/playwright.
**Option C — `.output/` only, with a separate release image.** Smallest, but Fly's
`release_command` runs in the same image as the app.

**Chosen:** A — moving `tsx`/`dotenv` to `dependencies` is the whole cost.

### Health check

**Option A — TCP check.** Confirms the server accepts connections; never touches the DB.
**Option B — HTTP check on `/`.** Stronger signal, but every page is DB-backed, so it would query
Neon every interval and keep its compute from ever suspending (cost). There is no DB-free route
(static assets are hash-named).

**Chosen:** A. A dedicated `/healthz` route can be added later if a stronger check is wanted.

### Neon connection

**Direct string with the existing postgres.js pool** over Neon's pooled (PgBouncer) string: the
Fly server is long-lived, so there is no connection fan-out to protect against, and prepared
statements keep working. `idle_timeout: 60` closes idle connections before Neon suspends (~5 min)
and drops them from under the pool.

---

## Tradeoffs <!-- required -->

- **Optimised for:** lowest cost at light traffic (Fly scale-to-zero + Neon scale-to-zero), safe
  deploys (release step gates traffic), and no application code changes beyond one pool option.
- **Given up / accepted:** cold starts — the first request after idle boots a Fly machine *and*
  wakes Neon (expect ~1–2 s); a 456 MB image; a TCP-only health check won't catch a server that
  is up but can't reach the DB; `CDN_BASE_URL` is stored as a Fly secret although it isn't
  secret (keeps a guessed domain out of `fly.toml`).

---

### Spec Divergence <!-- optional -->

No spec; implementation matches the ROADMAP B5 scope. One addition: the `idle_timeout` pool
option in `src/db/client.ts`, a Neon compatibility fix.

---

## Spec Gaps Exposed <!-- optional -->

- **`channel_binding` in Neon URLs** — must be stripped by hand; documented in the README. Could
  be handled in code (strip it before `postgres()`) if it bites again.
- **Stale content tests (pre-existing, not B5):** 9 tests in `test/content/chatacabra-*.test.tsx`
  fail on `main` too. They assert against the real `content/` MDX (`**Aviso:**` anatomy,
  `<Clip>` per move, a specific clip row) and were not updated when the Chatacabra movelist was
  rewritten (PR #9). Needs its own fix.
- **`fly config validate`** needs a Fly login, so `fly.toml` was not validated by flyctl here;
  the first `fly deploy` will.
- Not provisioned here: the Fly app, the Neon project, the R2 public domain, and the secrets.

---

## Test Evidence <!-- required -->

`docker build` succeeds (456 MB image). The release step against a **fresh, empty** database,
run twice (idempotent):

```
> tsx src/db/migrate.ts && tsx src/ingest/index.ts
Migrations applied.
Ingested 1 monsters, 2 guides, 9 clips.
```

The container server rendered `/`, the general and both weapon guides (200; general page title
and 9 `<video>` elements with `CDN_BASE_URL`-derived URLs on the longsword page), `/cuaderno`
(200), and 404 for an unknown path.

The full Playwright suite, run against the **Docker container** (not a local build) on the test
DB, including owner login, hunt create/edit/delete, and 401 on unauthenticated writes:

```
  15 passed (14.0s)
```

`pnpm typecheck` exits 0. Vitest: 109 passed, 9 failed — the same 9 fail on `main` (see Spec
Gaps; unrelated to B5).

postgres.js URL params, against local Postgres:

```
sslmode=disable { ok: 1 }
channel_binding=require ERR unrecognized configuration parameter "channel_binding"
```
