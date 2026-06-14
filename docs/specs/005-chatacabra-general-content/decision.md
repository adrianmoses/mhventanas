# Decision Record: Chatacabra General Page Content

| Field | Value |
|---|---|
| id | 005 |
| status | implemented |
| created | 2026-06-14 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

004 proved the author → ingest → SSR pipeline only against the thin `test/fixtures/` Chatacabra
file. 005 is the first feature to author real content under `content/` — the git source of truth
that ARCHITECTURE names but that did not exist on disk until now. It is the weapon-agnostic
foundation the Longsword (006) and Greatsword (007) guides build on.

The defining constraint going in was deliberate scope narrowing, settled during the spec dialogue:
the page is authored **structure-first** — full conventional sections and locked Spanish
vocabulary, but with factual game data left as greppable `TODO` markers and clips referenced by
placeholder slugs. Real Chatacabra move data and recorded WebMs are an explicit later fill pass.
This keeps unverified game facts out of the repo while letting the layout, vocabulary, pipeline
wiring, and tests land now. No spike was needed — confidence was High because the mechanism was
already proven.

One pipeline constraint shaped authoring: `generalFrontmatter` in `src/ingest/parse.ts` is
`.strict()` (only `name` + optional `variant`), so the stat block could not live in frontmatter
and was authored as a body list instead.

## Decision <!-- required -->

Author `content/wilds/chatacabra/index.mdx` as plain MDX (markdown + `<Clip>`, no new components),
with frontmatter `name: Chatacabra` and the conventional sections in order: tactical summary →
*Ficha técnica* (stat block as a body list) → *Lectura del combate* → *Estados* (Enfurecido /
Agotado) → *Baiting* → *Patrones* → *Movimientos clave* (three moves, each with the locked
`**Aviso:** / **Cómo funciona:** / **Qué vigilar:**` anatomy and a `<Clip>`). Unverified facts are
marked `TODO`; clips use placeholder slugs (`salto-bilis` reused from the repo as the stable anchor,
plus `movimiento-clave-2/3`). Ship one Vitest file, `test/content/chatacabra-general.test.tsx`,
that ingests the real `content/` root (idempotently), asserts the monster + clips, renders the
compiled page through the 004 machinery (`loadGeneralData` + `runMdx`), and structurally checks the
move anatomy and TODO marker. No route, schema, component, or pipeline code changed.

---

## Alternatives Considered <!-- required -->

### How much to author (component & content depth)

**Option A — structure + TODO content, plain markdown + `<Clip>`.**
- Pros: lands the real `content/` page, vocabulary, and pipeline wiring now; no wrong game facts
  committed; no component scope.
- Cons: the page is not a finished read until the fill pass.

**Option B — build the rich components (StatBlock / MoveCard / timeline) and author into them.**
- Pros: realizes the design vision; components reused by 006/007.
- Cons: large scope; couples first content to component design; 004 explicitly deferred these.

**Option C — draft real game facts from research now.**
- Pros: a complete page sooner.
- Cons: high risk of committing inaccurate MH Wilds data that undermines the product's credibility.

**Chosen:** A (confirmed in the spec dialogue). B's components stay deferred to 006/007; C's facts
are deferred to a verified fill pass.

### Where the stat block lives

**Option A — body list under `## Ficha técnica`.**
- Pros: works within the `.strict()` general frontmatter; no schema/component change.
- Cons: not structured data; a future StatBlock component would re-parse or re-author it.

**Option B — frontmatter fields (clase, elemento, …).**
- Pros: structured.
- Cons: **rejected by the pipeline** — `generalFrontmatter` is `.strict()` and would fail ingest.

**Chosen:** A. Resolves the spec's open question; structured stat-block data can come with the
StatBlock component later.

### Clip references with no recorded WebMs yet

**Option A — placeholder slugs now.** Chosen. 002 harvests them into `clips` rows with
003-convention URLs; 004 renders a `<video>` that degrades gracefully until the WebM exists.
**Option B — omit clips until recorded.** Rejected: it would leave the move anatomy incomplete and
hide the clip wiring the fill pass needs.

### Test coupling to the real `content/` directory

**Option A — ingest the real `content/` root and assert only Chatacabra-scoped facts.** Chosen —
proves real content actually ingests/renders; scoped asserts stay valid as 006/007 add files.
**Option B — copy content into a fixture and test that.** Rejected: it would test a copy, not the
shipped source of truth, and drift from it.

---

## Tradeoffs <!-- required -->

- **Page is not user-ready.** It renders structurally but shows `TODO` text and placeholder clips;
  it must not be deployed to a public site until the fill pass. Acceptable only because there is no
  public deploy yet (and the general page has no `published_at` gate to hide it).
- **The content test ingests the whole real `content/` root**, so it grows in cost/coupling as
  006/007 add files. Mitigated by scoping every assertion to the Chatacabra general guide and its
  clips, never global counts.
- **Stat block as prose** gives up structured data now in exchange for shipping within the existing
  schema; a later StatBlock component will supersede it.
- **Structural lint is substring-based** (anatomy labels, `TODO` token, section order), not a real
  MDX AST check — cheap and good enough to guard the skeleton, but not a deep content validator.

---

### Spec Divergence <!-- optional -->

The implementation matches the spec. One addition worth noting, anticipated by the spec's open
question rather than a divergence:

| Spec Said | What Was Built | Reason |
|---|---|---|
| Required sections: summary, Lectura del combate, Estados, Baiting, Patrones, key moves | Also added a `## Ficha técnica` stat-block list | The spec's open question explicitly contemplated capturing stat-block fields as a plain body list; included since the ARCHITECTURE design calls for it and it's cheap. |

All acceptance criteria were satisfied as written.

---

## Spec Gaps Exposed <!-- optional -->

- **No machine-checkable "fill-pass complete" signal.** "Done" for the real content is the absence
  of `TODO` markers and the presence of real clips, but nothing enforces that. A future feature (or
  006/007's authoring) may want a check that fails CI if a *published* guide still contains `TODO`,
  or a lint that flags `<Clip>` slugs with no uploaded WebM. Candidate for a small follow-up.
- **General pages have no visibility gate.** `published_at` is weapon-only (`punish_guides`), so a
  general page with TODO content cannot be hidden by the existing mechanism. Fine now (no public
  deploy), but if a draft workflow for general pages is ever wanted, the schema would need a gate —
  worth noting against the OVERVIEW open question on `published_at` semantics.

---

## Test Evidence <!-- required -->

`pnpm ingest` over the real `content/` root — first run and immediate re-run (idempotent: identical
counts, no error; 0 guides because only the general `index.mdx` exists, 3 clips from the harvested
placeholder slugs):

```
Ingested 1 monsters, 0 guides, 3 clips.
Ingested 1 monsters, 0 guides, 3 clips.
```

New content suite (`test/content/chatacabra-general.test.tsx`) — ingest idempotency, monster+clips,
render order + `<video>`, and the structural anatomy/TODO checks:

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

Full Vitest suite (004 suites unaffected; +4 new):

```
 Test Files  14 passed (14)
      Tests  42 passed (42)
```

TypeScript (strict, NodeNext):

```
> tsc --noEmit
tsc --noEmit: OK
```

Manual SSR check against the dev server (`/guias/wilds/chatacabra`, dev DB seeded by `pnpm ingest`)
confirmed all six sections render in order and both the `salto-bilis` and placeholder-slug
`<video>` elements appear. `grep -rc TODO content/wilds/chatacabra/index.mdx` → `22` (the fill-pass
worklist).
```
section "Lectura del combate": YES   section "Estados": YES   section "Baiting": YES
section "Patrones": YES   section "Movimientos clave": YES   section "Ficha técnica": YES
salto-bilis <video>: YES   placeholder clip (movimiento-clave-2) video: YES
```
