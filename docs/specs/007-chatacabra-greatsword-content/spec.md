# Spec: Chatacabra Greatsword Page Content

| Field | Value |
|---|---|
| id | 007 |
| status | implemented |
| created | 2026-06-14 |

---

## Why <!-- required -->

The general page (005) teaches *what* Chatacabra does and which actions open a window; the
Greatsword page is where that turns into payoff — *exactly how* a Gran Espada main punishes those
windows. It is the second of the two weapon guides that complete the v1 Chatacabra vertical slice.
Together with 006 it exercises the `punish_guides` / `weapon_type` half of the schema and the 004
weapon route across both launch weapons.

As with 005 and 006, this feature authors **structure, not yet verified facts**: the full
conventional weapon-page layout, locked Spanish vocabulary, and the weapon-specific `respuesta`
callout, with game data left as greppable `TODO` markers and clips on placeholder slugs. Real
offset/TCS timings and recorded WebMs are a later fill pass.

### Consumer Impact <!-- required -->

The consumer is the OVERVIEW reader who mains **Gran Espada (Greatsword)**. They reach the page at
`/guias/wilds/chatacabra/greatsword` (also now linked from the Chatacabra general page) and get the
GS-specific punish guide: the key techniques (offsets, True Charged Slash / TCS windows, tiempos de
carga) and, per punishable monster action, the `aviso / cómo funciona / qué vigilar` read plus a
**respuesta** spelling out the GS punish, with an embedded clip slot. At this stage the prose is
TODO-marked and the clips are placeholders, so it is structurally complete but not yet a finished
read.

### Roadmap Fit <!-- required -->

007 depends on 002 (compiles this MDX, harvests `<Clip>`), 003 (clip URL convention), 004 (the
weapon route + `published_at` gating that serves it), and 005 (the general page it complements and
whose move/state vocabulary it reuses). It is a sibling of 006 (Longsword), authored together on
one branch. With 007 done, the v1 Chatacabra slice has general + both weapon pages; it precedes 008
(SEO + i18n + full E2E) and does not depend on it.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] A real content file exists at `content/wilds/chatacabra/greatsword.mdx`, distinct from the
      `test/fixtures/` copy.
- [ ] Its frontmatter sets `published_at` to a past date (the only key the weapon frontmatter
      allows), so the 004 loader treats the guide as live.
- [ ] The page is structured with weapon-page sections, in order: an intro/summary framing GS vs
      Chatacabra, a *Técnicas clave* section (offsets, True Charged Slash / TCS, tiempos de carga),
      and a *Ventanas de castigo* section with a curated set of punishable moves.
- [ ] Each move in *Ventanas de castigo* uses the anatomy `aviso`, `cómo funciona`, `qué vigilar`,
      **and `respuesta`** (the GS-specific punish), and embeds a `<Clip slug="…" />` (placeholder
      slug allowed; monster-level clips like `salto-bilis` may be reused).
- [ ] All headings and copy use the locked Spanish vocabulary and GS technique names from
      ARCHITECTURE (`ventana de castigo`, `respuesta`, offset, TCS); no English chrome.
- [ ] Unverified game content is marked with the same greppable `TODO` token used in 005/006.
- [ ] `pnpm ingest` over `content/` compiles the file and upserts the `punish_guides` row
      (`weapon_type = greatsword`) plus its harvested clips, idempotently.
- [ ] The page renders at `/guias/wilds/chatacabra/greatsword` through the 004 route (sections in
      order; each `<Clip>` a `<video>` or graceful placeholder), and the Chatacabra general page now
      lists a link to it.

### Non-Goals <!-- required -->

- **Longsword content** — 006 (sibling spec). 007 authors only `greatsword.mdx`.
- **General-page content** — 005 (done). 007 does not re-author `index.mdx`.
- **Rich design components** — StatBlock / MoveCard / punish-window timeline bar remain deferred;
  plain markdown + `<Clip>` only.
- **Verified game facts and real clips** — accurate GS timings and recorded WebMs are a later fill
  pass; 007 ships structure with TODO prose and placeholder slugs.
- **SEO / i18n polish and the full E2E suite** — 008.

### Open Questions <!-- optional -->

- The exact curated punishable-move list and which GS tool (offset vs TCS) each maps to is deferred
  to the fill pass; the structure must accommodate adding/removing moves without rework.

---

## How <!-- required -->

### Approach <!-- required -->

Create `content/wilds/chatacabra/greatsword.mdx` (the monster dir and general `index.mdx` already
exist from 005). Author it as MDX, mirroring the 005/006 pattern with GS flavor:

- **Frontmatter:** `published_at: <past date>` only (weapon frontmatter is `.strict()` — no other
  keys; no `name`).
- **Body** in standard markdown + `<Clip>`, no custom components. Sections: an intro/summary
  (`## Resumen` or similar) → `## Técnicas clave` (GS tools: offsets, True Charged Slash / TCS,
  tiempos de carga) → `## Ventanas de castigo` with `### {move}` subsections, each carrying
  `**Aviso:**`, `**Cómo funciona:**`, `**Qué vigilar:**`, `**Respuesta:**` (values TODO) and a
  `<Clip>`.
- **Vocabulary** locked to ARCHITECTURE; **facts marked `TODO`** with the same token as 005/006.
- **Clips** by placeholder slugs; reuse monster-level slugs (e.g. `salto-bilis`) where the same
  action is punished, add GS-specific slugs (e.g. `offset-tackle`) as needed. 002 harvests them;
  004 renders `<video>` and degrades gracefully until upload.

Ingest is run against `content/` and the page viewed through the existing 004 weapon route to
confirm it compiles, upserts as a published `greatsword` guide, renders, and is linked from the
general page.

### Confidence <!-- required -->

**Level:** High

**Rationale:** Identical mechanism to 005/006 — the weapon path (`punish_guides`, `published_at`
gating, the weapon route) is already proven by 004 against the Chatacabra fixtures, which contain a
`greatsword.mdx` and a `<Clip>`. The only uncertainty is content accuracy, removed from scope via
TODO markers. No spike needed.

### Key Decisions <!-- optional -->

- **Author published (past `published_at`)** so the page renders now and the general page links
  light up — accepting that the TODO content must not be deployed to a public site until the fill
  pass (same posture as 005/006; no public deploy exists yet).
- **Move anatomy adds `respuesta`** over the 005 three-label set — the weapon-specific callout that
  distinguishes a weapon page, using locked ARCHITECTURE vocabulary.
- **Structure-first with TODO prose / placeholder clips** — keeps unverified GS timings out of the
  repo while landing the layout, vocabulary, and pipeline wiring.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for the pipeline/queries, Playwright for core routes,
TypeScript first), extending the 005/006 content suite:

- **Vitest — ingest:** ingest `content/` and assert the `greatsword` punish guide upserts with a
  past `published_at` and non-empty content, and that its clips harvest into rows; assert
  idempotency on re-run. Scope assertions to the GS guide (no global counts).
- **Render check:** reuse `loadWeaponData` (`src/app/loaders/queries.ts`) + `runMdx` +
  `renderToStaticMarkup` to assert the conventional weapon sections render (*Técnicas clave*,
  *Ventanas de castigo*) with a `<video>`.
- **Structural check:** read the raw `greatsword.mdx`; assert every `### ` move under *Ventanas de
  castigo* includes `aviso` / `cómo funciona` / `qué vigilar` / **`respuesta`** and a `<Clip>`, and
  that the `TODO` marker is present.
- **General-page link:** assert `loadGeneralData({game:"wilds",monster:"chatacabra"})` now includes
  `greatsword` in its published `weapons` list (alongside `longsword` from 006).
- **TypeScript / 002 validation** continue to guard weapon frontmatter and `<Clip>` shape.
