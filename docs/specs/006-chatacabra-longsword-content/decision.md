# Decision Record: Chatacabra Longsword Page Content

| Field | Value |
|---|---|
| id | 006 |
| status | implemented |
| created | 2026-06-14 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

006 is the weapon-page analog of 005, authored together with its sibling 007 (Greatsword) on one
branch (`006-007-chatacabra-weapon-content`). It adds the Espada Larga punish guide that the 005
general page set up and linked toward, and is the first content to exercise the `punish_guides` /
`weapon_type` half of the schema and the 004 weapon route through real `content/` files (only the
fixtures had done so before).

As with 005, it is a **structure-first** content step: full conventional weapon-page layout and
locked Spanish vocabulary, but game facts left as greppable `TODO` markers and clips on placeholder
slugs. Real Iai/Sakura-Slash timings and recorded WebMs are a later fill pass. Confidence was High;
no spike — the weapon path was already proven by 004.

Two pipeline constraints shaped authoring: weapon frontmatter (`src/ingest/parse.ts`) is `.strict()`
allowing only `published_at` (no `name`), and clips merge per-slug across a monster's files
(`mergeMonsterClips`, `src/ingest/validate.ts`), so reusing the monster-level `salto-bilis` slug
required omitting a (conflicting) caption.

## Decision <!-- required -->

Author `content/wilds/chatacabra/longsword.mdx` as plain MDX (markdown + `<Clip>`, no new
components) with `published_at: 2026-06-14` (a past date, so the 004 loader treats it as live and
the general page links to it). Body: intro/`# Chatacabra con Espada Larga` (TODO) → `## Técnicas
clave` (Contraataque Iai, Tajo del Filo Espiritual / Sakura Slash, tiempo del Iai) → `## Ventanas
de castigo` with two `### {move}` subsections, each carrying the locked anatomy `**Aviso:** /
**Cómo funciona:** / **Qué vigilar:** / **Respuesta:**` (the LS-specific punish) and a `<Clip>`.
Facts are `TODO`; clips use placeholder slugs (`salto-bilis` reused uncaptioned + LS-specific
`contraataque-cabeza`). Verification is shared with 007 via a parameterized
`test/content/chatacabra-weapons.test.tsx`. No route, schema, component, or pipeline code changed.

---

## Alternatives Considered <!-- required -->

### Publish state for a TODO-content weapon page

**Option A — published (past `published_at`).** Chosen.
- Pros: the page renders now and the general page's weapon link lights up, so the whole slice is
  curl-verifiable; consistent posture with 005.
- Cons: TODO content is visible, so it must not be deployed to a public site until the fill pass.

**Option B — unpublished (omit `published_at`).**
- Pros: 004 gates it (404 + omitted link) until real content lands — a true draft.
- Cons: can't verify the live page directly (would need to publish a row in a test); the general
  page wouldn't show the link yet.

**Chosen:** A (confirmed in the spec dialogue). No public deploy exists, so the visibility cost is
moot now; the rendering payoff is immediate.

### Move anatomy

**Option A — add `**Respuesta:**`** to the 005 `Aviso / Cómo funciona / Qué vigilar` set. Chosen —
the weapon-specific punish callout is what distinguishes a weapon page, and it's locked ARCHITECTURE
vocabulary.
**Option B — reuse the general three-label anatomy unchanged.** Rejected: it would make the weapon
page structurally identical to the general page and omit the punch line (how *this* weapon punishes).

### Clip references

**Option A — reuse the monster-level `salto-bilis` (uncaptioned) + an LS-specific slug.** Chosen —
clips are monster-level assets; reuse models the shared action, and omitting the caption avoids the
`mergeMonsterClips` conflict abort.
**Option B — all-new LS-only slugs.** Rejected: duplicates a clip that is conceptually the same
monster action.

---

## Tradeoffs <!-- required -->

- **Page not user-ready:** renders structurally but shows `TODO` and placeholder clips; must not be
  deployed publicly until the fill pass (acceptable — no public deploy yet).
- **Reused `salto-bilis` is uncaptioned on this page**, so the caption lives only with the general
  page's reference; the fill pass can add a weapon-context caption if wanted (consistently across
  files to avoid the merge conflict).
- **Two curated moves only** (one named, one placeholder) — enough to lock the structure; the real
  move list is a fill-pass decision the layout already accommodates.
- Verification is **shared** with 007 in one parameterized test file — efficient, but means a 006
  regression and a 007 regression surface in the same suite.

---

### Spec Divergence <!-- optional -->

The implementation matches the spec. No divergences. (One detail within spec latitude: the intro is
a level-1 heading `# Chatacabra con Espada Larga` rather than a `## Resumen`; the spec offered
"`## Resumen` or similar".)

---

## Spec Gaps Exposed <!-- optional -->

- Reinforces backlog **B1** (from 005): with three pages now carrying `TODO` and placeholder
  `<Clip>` slugs, a CI check that fails when a *published* guide still contains `TODO` (or
  references a slug with no uploaded WebM) would directly de-risk the fill pass before any public
  deploy. No new gaps unique to 006.

---

## Test Evidence <!-- required -->

`pnpm ingest` over `content/`, first run and immediate re-run (idempotent; now 2 guides — LS + GS —
and 5 clips across the monster's files):

```
Ingested 1 monsters, 2 guides, 5 clips.
Ingested 1 monsters, 2 guides, 5 clips.
```

The shared weapon suite (`test/content/chatacabra-weapons.test.tsx`, parameterized over longsword +
greatsword: ingest idempotency, `loadWeaponData` live guide/clips, render order + `<video>`,
structural anatomy incl. `Respuesta`, and the general-page link assertion):

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Full Vitest suite (004 + 005 unaffected):

```
 Test Files  15 passed (15)
      Tests  49 passed (49)
```

TypeScript: `tsc --noEmit` clean. `grep -rc TODO content/wilds/chatacabra/longsword.mdx` → `13`.

Manual SSR check against the dev server confirmed `/guias/wilds/chatacabra/longsword` returns 200
with *Técnicas clave* / *Ventanas de castigo* in order, a `<video>`, the `Respuesta` label and
`Contraataque Iai`, and that the general page now links Espada Larga:

```
200  /guias/wilds/chatacabra/longsword
  "Técnicas clave": YES   "Ventanas de castigo": YES   "Respuesta": YES
  "Contraataque Iai": YES   <video>: YES
general page → Espada Larga link: YES
```
