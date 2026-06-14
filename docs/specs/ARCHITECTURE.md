# Architecture

<!-- status: draft | approved -->
| Field | Value |
|---|---|
| status | approved |
| created | 2026-06-13 |

## System Overview <!-- required -->

TanStack Start renders guide pages server-side (Vite build + Nitro server output) by reading content from PostgreSQL.
**Git is the source of truth for content; Postgres is the read store.** Authors write MDX files
in the repo. At build/deploy time an ingest pipeline parses and compiles each MDX file (resolving
custom components such as `<Clip>`) and upserts the result into Postgres. Route loaders query
Postgres by slug and return compiled content for SSR. WebM clips are not stored in the DB or the
repo body — they live on object storage behind a CDN and are referenced by URL.

## Component Map <!-- required -->

1. **MDX content + components** — `content/` MDX files organized by game/monster/weapon, plus
   shared MDX components, notably `<Clip>` for embedding a looped WebM by reference.
2. **Ingest pipeline** — Node/Vitest-tested script that walks `content/`, compiles MDX, extracts
   frontmatter (slugs, weapon_type, published_at) and clip references, then upserts rows into
   `monsters`, `punish_guides`, and `clips`. Runs at build/deploy.
3. **PostgreSQL** — read store. Tables: `monsters`, `punish_guides`, `clips` (see Data Flow).
4. **TanStack Start routes** — `/guias/:game/:monster` (general) and
   `/guias/:game/:monster/:weapon` (weapon-specific). Loaders resolve slugs → DB rows.
5. **Media (object storage + CDN)** — Cloudflare R2 or S3 hosting WebM clips, served via CDN and
   referenced by URL from `clips` rows / MDX `<Clip>`.

## Data Flow <!-- required -->

```
author MDX (content/, source of truth)
        │  build/deploy
        ▼
ingest pipeline  ──compile MDX, extract frontmatter + clip refs──▶  PostgreSQL
                                                                       │
                                          route loader (slug lookup) ◀─┘
                                                       │
                                                  SSR HTML  ──▶  browser
                                                       │
                          WebM <Clip> URLs ──▶ CDN/object storage ──▶ browser
```

**Proposed schema (extends the brief's sample with slugs + a clips table):**

- `monsters (id, slug, name, variant, game, overview_content, created_at, updated_at)`
  - `slug` (e.g. `chatacabra`) + `game` (e.g. `wilds`) drive the URL; `overview_content` is the
    compiled MDX of the general page.
- `punish_guides (id, monster_id, weapon_type, content, published_at, created_at, updated_at)`
  - `weapon_type` ∈ {`longsword`, `greatsword`}; `content` is compiled weapon-page MDX.
- `clips (id, monster_id, punish_guide_id NULL, slug, url, caption, created_at)`
  - WebM metadata; linked to a monster and optionally to a specific punish guide. URL points at
    the CDN. Referenced from MDX via `<Clip slug="..." />`.

## External Dependencies <!-- required -->

- **Object storage + CDN** — Cloudflare R2 or S3 for WebM clips (host TBD).
- **PostgreSQL host** — managed Postgres (provider TBD).
- **Deploy target** — hosting platform TBD. Note (004): the installed TanStack Start build is
  Vite-based; its default SSR output is a fetch handler, so the `nitro/vite` plugin (Nitro v3) is
  added to compile a runnable Node server at `.output/server/index.mjs`, started with
  `node .output/server/index.mjs` (reads `PORT`/`DATABASE_URL`). Any plain Node service instance
  can host it; the specific platform is still TBD.

## Key Constraints <!-- required -->

- **Spanish-only** content at launch; copy, slugs, and captions in Spanish.
- **SEO-friendly SSR** — guide pages must render server-side with proper metadata.
- **WebM playback** — clips autoplay, loop, muted, inline; must degrade gracefully.
- **Git as source of truth** — Postgres is always rebuildable from MDX via re-ingest; ingest must
  be idempotent (upsert by slug, not blind insert).

## Design Inspiration <!-- optional -->

A Claude Design prototype (Rey Dau page) was reviewed on 2026-06-13 and then removed — it
deviated enough (too much info, too many weapons, boxy "HUD" styling, a blog) to be a
distraction as a literal reference. What is worth carrying forward, captured here so the
prototype itself isn't needed:

**Keep as inspiration:**

- **Page skeleton** — hero (monster render + stat block) → tactical summary → "Lectura del
  combate" prose → per-move codex. Maps cleanly onto general + punish-guide content.
- **Move-card anatomy** — per move: telegraph (`aviso`), `cómo funciona`, `qué vigilar`, an
  embedded `.webm` clip, and a weapon-specific `respuesta` callout.
- **Punish-window timeline bar** — the standout idea: a color-coded bar (Telégrafo → Ataque
  activo → Ventana de castigo → Recuperación) with per-segment second values. It visualizes the
  punish window far better than prose; treat it as a core MDX component.
- **Spanish section vocabulary** — `ventana de castigo`, `valor de castigo` (N/5), `aviso`,
  `cómo funciona`, `qué vigilar`, `respuesta`. Lock these as standard guide conventions.
- **Stat block fields** — clase, elemento, hábitat, rugido, debilidades elementales, partes
  rompibles.

**Explicitly discard:**

- Separate **blog** (nav + footer) — out of scope per OVERVIEW non-goals.
- The full **weapon roster** (5+ weapons, "+N más") — launch is LS + GS only.
- The **boxy styling** — corner-bracket ornaments and cards-nested-in-cards. Prefer whitespace
  and type hierarchy over a tactical-UI skin; keep at most one level of card.

**Glossary to lock:** Espada Larga = Longsword (`longsword`); Gran Espada = Greatsword
(`greatsword`). Keep technique names consistent across guides (e.g. Contraataque Iai, Tajo del
Filo Espiritual, TCS).

## Open Decisions <!-- optional -->

- Final choice of R2 vs S3, Postgres host, and the deploy target.
- Whether ingest runs at build time (baked) or as a separate deploy step against a live DB.
- **Resolved (2026-06-13):** split routes (general + per-weapon pages, one MDX/`punish_guides`
  row each) over the prototype's single-page client-side weapon toggle — simpler authoring,
  better SEO/shareability. The general page may still surface weapon links at the top.
- **Resolved (2026-06-14, 004):** clip reference resolution — `<Clip>` URLs are resolved at
  render time from the `clips` table by slug (the loader builds a slug→URL map), keeping the CDN
  host out of the stored MDX so a CDN move needs no re-ingest.
- **Resolved (2026-06-14, 004):** `published_at` is a real visibility gate, not display-only — a
  guide is live only when `published_at` is set and `<= now`; NULL/future guides 404 and are
  dropped from weapon links, enforced in the route loaders.
