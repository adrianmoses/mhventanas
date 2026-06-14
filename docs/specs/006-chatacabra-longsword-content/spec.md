# Spec: Chatacabra Longsword Page Content

| Field | Value |
|---|---|
| id | 006 |
| status | implemented |
| created | 2026-06-14 |

---

## Why <!-- required -->

The general page (005) teaches *what* Chatacabra does and which actions open a window; the
Longsword page is where that turns into payoff — *exactly how* an Espada Larga main punishes those
windows. It is one of the two weapon guides that complete the v1 Chatacabra vertical slice, and it
is the first weapon page authored through the real pipeline, exercising the `punish_guides` /
`weapon_type` half of the schema and the 004 weapon route that the general page only linked toward.

As with 005, this feature authors **structure, not yet verified facts**: the full conventional
weapon-page layout, locked Spanish vocabulary, and the weapon-specific `respuesta` callout, with
game data left as greppable `TODO` markers and clips on placeholder slugs. Real Iai/Sakura-Slash
timings and recorded WebMs are a later fill pass.

### Consumer Impact <!-- required -->

The consumer is the OVERVIEW reader who mains **Espada Larga (Longsword)**. They reach the page at
`/guias/wilds/chatacabra/longsword` (also now linked from the Chatacabra general page) and get the
LS-specific punish guide: the key techniques (Contraataque Iai timing, Tajo del Filo Espiritual /
Sakura Slash windows) and, per punishable monster action, the `aviso / cómo funciona / qué vigilar`
read plus a **respuesta** spelling out the LS punish, with an embedded clip slot. At this stage the
prose is TODO-marked and the clips are placeholders, so it is structurally complete but not yet a
finished read.

### Roadmap Fit <!-- required -->

006 depends on 002 (compiles this MDX, harvests `<Clip>`), 003 (clip URL convention), 004 (the
weapon route + `published_at` gating that serves it), and 005 (the general page it complements and
whose move/state vocabulary it reuses). It is a sibling of 007 (Greatsword), authored together on
one branch. It precedes 008 (SEO + i18n + full E2E) and does not depend on it.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] A real content file exists at `content/wilds/chatacabra/longsword.mdx`, distinct from the
      `test/fixtures/` copy.
- [ ] Its frontmatter sets `published_at` to a past date (the only key the weapon frontmatter
      allows), so the 004 loader treats the guide as live.
- [ ] The page is structured with weapon-page sections, in order: an intro/summary framing LS vs
      Chatacabra, a *Técnicas clave* section (Contraataque Iai, Tajo del Filo Espiritual / Sakura
      Slash, Iai timing), and a *Ventanas de castigo* section with a curated set of punishable
      moves.
- [ ] Each move in *Ventanas de castigo* uses the anatomy `aviso`, `cómo funciona`, `qué vigilar`,
      **and `respuesta`** (the LS-specific punish), and embeds a `<Clip slug="…" />` (placeholder
      slug allowed; monster-level clips like `salto-bilis` may be reused).
- [ ] All headings and copy use the locked Spanish vocabulary and LS technique names from
      ARCHITECTURE (`ventana de castigo`, `respuesta`, Contraataque Iai, Tajo del Filo Espiritual);
      no English chrome.
- [ ] Unverified game content is marked with the same greppable `TODO` token used in 005.
- [ ] `pnpm ingest` over `content/` compiles the file and upserts the `punish_guides` row
      (`weapon_type = longsword`) plus its harvested clips, idempotently.
- [ ] The page renders at `/guias/wilds/chatacabra/longsword` through the 004 route (sections in
      order; each `<Clip>` a `<video>` or graceful placeholder), and the Chatacabra general page now
      lists a link to it.

### Non-Goals <!-- required -->

- **Greatsword content** — 007 (sibling spec). 006 authors only `longsword.mdx`.
- **General-page content** — 005 (done). 006 does not re-author `index.mdx`.
- **Rich design components** — StatBlock / MoveCard / punish-window timeline bar remain deferred;
  plain markdown + `<Clip>` only.
- **Verified game facts and real clips** — accurate LS timings and recorded WebMs are a later fill
  pass; 006 ships structure with TODO prose and placeholder slugs.
- **SEO / i18n polish and the full E2E suite** — 008.

### Open Questions <!-- optional -->

- The exact curated punishable-move list and which LS technique each maps to is deferred to the
  fill pass; the structure must accommodate adding/removing moves without rework.

---

## How <!-- required -->

### Approach <!-- required -->

Create `content/wilds/chatacabra/longsword.mdx` (the monster dir and general `index.mdx` already
exist from 005). Author it as MDX, mirroring the 005 pattern with weapon flavor:

- **Frontmatter:** `published_at: <past date>` only (weapon frontmatter is `.strict()` — no other
  keys; no `name`).
- **Body** in standard markdown + `<Clip>`, no custom components. Sections: an intro/summary
  (`## Resumen` or similar) → `## Técnicas clave` (LS tools: Contraataque Iai, Tajo del Filo
  Espiritual / Sakura Slash, Iai timing) → `## Ventanas de castigo` with `### {move}` subsections,
  each carrying `**Aviso:**`, `**Cómo funciona:**`, `**Qué vigilar:**`, `**Respuesta:**` (values
  TODO) and a `<Clip>`.
- **Vocabulary** locked to ARCHITECTURE; **facts marked `TODO`** with the same token as 005 so the
  fill pass can grep across `content/`.
- **Clips** by placeholder slugs; reuse monster-level slugs (e.g. `salto-bilis`) where the same
  action is punished, add LS-specific slugs (e.g. `contraataque-cabeza`) as needed. 002 harvests
  them; 004 renders `<video>` and degrades gracefully until upload.

Ingest is run against `content/` and the page viewed through the existing 004 weapon route to
confirm it compiles, upserts as a published `longsword` guide, renders, and is linked from the
general page.

### Confidence <!-- required -->

**Level:** High

**Rationale:** Identical mechanism to 005, now on the weapon side — and the weapon path
(`punish_guides`, `published_at` gating, the weapon route) is already proven by 004 against the
Chatacabra fixtures, which contain exactly a `longsword.mdx` with `published_at` and a `<Clip>`.
The only uncertainty is content accuracy, removed from scope via TODO markers. No spike needed.

### Key Decisions <!-- optional -->

- **Author published (past `published_at`)** so the page renders now and the general page links
  light up, rather than gated/unpublished — accepting that the TODO content must not be deployed to
  a public site until the fill pass (same posture as 005; no public deploy exists yet).
- **Move anatomy adds `respuesta`** over the 005 three-label set — this weapon-specific callout is
  what distinguishes a weapon page and uses locked ARCHITECTURE vocabulary.
- **Structure-first with TODO prose / placeholder clips** — keeps unverified LS timings out of the
  repo while landing the layout, vocabulary, and pipeline wiring.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for the pipeline/queries, Playwright for core routes,
TypeScript first), extending the 005 content suite:

- **Vitest — ingest:** ingest `content/` and assert the `longsword` punish guide upserts with a
  past `published_at` and non-empty content, and that its clips harvest into rows; assert
  idempotency on re-run. Scope assertions to the LS guide (no global counts).
- **Render check:** reuse `loadWeaponData` (`src/app/loaders/queries.ts`) + `runMdx` +
  `renderToStaticMarkup` to assert the conventional weapon sections render (*Técnicas clave*,
  *Ventanas de castigo*) with a `<video>`.
- **Structural check:** read the raw `longsword.mdx`; assert every `### ` move under *Ventanas de
  castigo* includes `aviso` / `cómo funciona` / `qué vigilar` / **`respuesta`** and a `<Clip>`, and
  that the `TODO` marker is present.
- **General-page link:** assert `loadGeneralData({game:"wilds",monster:"chatacabra"})` now includes
  `longsword` in its published `weapons` list.
- **TypeScript / 002 validation** continue to guard weapon frontmatter and `<Clip>` shape.
