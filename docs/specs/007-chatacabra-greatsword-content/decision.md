# Decision Record: Chatacabra Greatsword Page Content

| Field | Value |
|---|---|
| id | 007 |
| status | implemented |
| created | 2026-06-14 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

007 is the Gran Espada sibling of 006, authored together on one branch
(`006-007-chatacabra-weapon-content`). With it, the v1 Chatacabra slice has the general page (005)
plus both weapon punish guides; together 006/007 exercise the `punish_guides` / `weapon_type` half
of the schema and the 004 weapon route across both launch weapons through real `content/` files.

Like 005/006 it is a **structure-first** content step: full conventional weapon-page layout and
locked Spanish vocabulary, with game facts as greppable `TODO` markers and clips on placeholder
slugs (real offset/TCS timings + recorded WebMs are a later fill pass). Confidence was High; no
spike — the weapon path was already proven by 004.

Same two pipeline constraints as 006 applied: weapon frontmatter (`src/ingest/parse.ts`) is
`.strict()` (only `published_at`), and clips merge per-slug across a monster's files
(`mergeMonsterClips`, `src/ingest/validate.ts`), so the reused monster-level `salto-bilis` slug is
referenced without a conflicting caption.

## Decision <!-- required -->

Author `content/wilds/chatacabra/greatsword.mdx` as plain MDX (markdown + `<Clip>`, no new
components) with `published_at: 2026-06-14` (live). Body: intro/`# Chatacabra con Gran Espada`
(TODO) → `## Técnicas clave` (offsets, True Charged Slash / TCS, tiempos de carga) → `## Ventanas de
castigo` with two `### {move}` subsections, each carrying the locked anatomy `**Aviso:** / **Cómo
funciona:** / **Qué vigilar:** / **Respuesta:**` (the GS-specific punish) and a `<Clip>`. Facts are
`TODO`; clips use placeholder slugs (`salto-bilis` reused uncaptioned + GS-specific `offset-tackle`).
Verification is shared with 006 via the parameterized `test/content/chatacabra-weapons.test.tsx`.
No route, schema, component, or pipeline code changed.

---

## Alternatives Considered <!-- required -->

### Publish state for a TODO-content weapon page

**Option A — published (past `published_at`).** Chosen.
- Pros: renders now and lights up the general page's Gran Espada link; the whole slice is
  curl-verifiable; consistent with 005/006.
- Cons: TODO content is visible, so it must not be deployed publicly until the fill pass.

**Option B — unpublished (omit `published_at`).**
- Pros: 004 gates it (404 + omitted link) until real content lands.
- Cons: can't verify the live page directly; general page wouldn't show the link.

**Chosen:** A (confirmed in the spec dialogue) — no public deploy exists, so the visibility cost is
moot and the rendering payoff is immediate.

### Move anatomy

**Option A — add `**Respuesta:**`** (the GS punish: offset / TCS) to the 005 three-label set.
Chosen — it is what makes this a weapon page and is locked ARCHITECTURE vocabulary.
**Option B — reuse the general three-label anatomy.** Rejected: omits how *Gran Espada* punishes.

### Clip references

**Option A — reuse monster-level `salto-bilis` (uncaptioned) + GS-specific `offset-tackle`.**
Chosen — models the shared monster action and avoids the `mergeMonsterClips` caption-conflict abort.
**Option B — all-new GS-only slugs.** Rejected: duplicates a conceptually identical monster action.

---

## Tradeoffs <!-- required -->

- **Page not user-ready:** structural only — `TODO` prose + placeholder clips; must not be deployed
  publicly until the fill pass (acceptable — no public deploy yet).
- **Reused `salto-bilis` uncaptioned here** (caption lives with the general-page reference); the
  fill pass can add a consistent caption across files if wanted.
- **Two curated moves** (one named, one placeholder) — locks the structure; the real move list is a
  fill-pass decision the layout accommodates.
- **Shared verification with 006** in one parameterized file — efficient, but couples the two
  features' regressions into one suite.

---

### Spec Divergence <!-- optional -->

The implementation matches the spec. No divergences. (As with 006, the intro uses a level-1 heading
`# Chatacabra con Gran Espada` rather than `## Resumen`, within the spec's "or similar" latitude.)

---

## Spec Gaps Exposed <!-- optional -->

- Reinforces backlog **B1** (from 005), now across all three Chatacabra pages: a CI check that fails
  when a *published* guide still contains `TODO`, or references a `<Clip>` slug with no uploaded
  WebM, would de-risk the fill pass before any public deploy. No new gaps unique to 007.

---

## Test Evidence <!-- required -->

`pnpm ingest` over `content/`, first run and immediate re-run (idempotent; 2 guides — LS + GS — and
5 clips):

```
Ingested 1 monsters, 2 guides, 5 clips.
Ingested 1 monsters, 2 guides, 5 clips.
```

The shared weapon suite (`test/content/chatacabra-weapons.test.tsx`, parameterized over longsword +
greatsword: ingest idempotency, `loadWeaponData` live guide/clips, render order + `<video>`,
structural anatomy incl. `Respuesta`, and the general-page link assertion that `weapons` equals
`["longsword","greatsword"]`):

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Full Vitest suite (004 + 005 unaffected):

```
 Test Files  15 passed (15)
      Tests  49 passed (49)
```

TypeScript: `tsc --noEmit` clean. `grep -rc TODO content/wilds/chatacabra/greatsword.mdx` → `13`.

Manual SSR check against the dev server confirmed `/guias/wilds/chatacabra/greatsword` returns 200
with *Técnicas clave* / *Ventanas de castigo* in order, the `Respuesta` label and `TCS`, and that
the general page now links Gran Espada:

```
200  /guias/wilds/chatacabra/greatsword
  "Técnicas clave": YES   "Ventanas de castigo": YES   "Respuesta": YES   "TCS": YES
general page → Gran Espada link: YES
```
