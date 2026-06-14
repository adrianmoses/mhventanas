# Spec: Chatacabra General Page Content

| Field | Value |
|---|---|
| id | 005 |
| status | implemented |
| created | 2026-06-14 |

---

## Why <!-- required -->

004 built the render pipeline but proved it only against a thin test fixture. The product's
actual value is the guide content itself — and the Chatacabra general page is the weapon-agnostic
foundation that the Longsword (006) and Greatsword (007) punish guides build on. A hunter reads
the general page first to learn the move set, what triggers specific attacks, the enraged/
exhausted states, and how to bait — context the weapon pages assume rather than repeat.

This feature exists to author that page as real content in `content/` (the git source of truth),
establishing the conventional structure and locked Spanish vocabulary that every later guide will
follow. It is the first real exercise of the full author → ingest → SSR path with a properly
structured page rather than a fixture.

### Consumer Impact <!-- required -->

The consumer is the OVERVIEW's target reader: a Spanish-speaking, intermediate-to-advanced Monster
Hunter player who mains Longsword or Greatsword. They get the Chatacabra general guide at
`/guias/wilds/chatacabra` — a tactical summary, a *lectura del combate* read of the fight, its
estados / baiting / patrones, and a curated set of the key punishable or telegraphed moves, each
with the `aviso / cómo funciona / qué vigilar` anatomy and an embedded clip slot. At this stage the
factual prose is TODO-marked and the clips are placeholder references, so the page is structurally
complete but not yet a finished read for the hunter — the real data and clips arrive in a later
fill pass.

### Roadmap Fit <!-- required -->

005 depends on 002 (the ingest pipeline that compiles this MDX and harvests its `<Clip>` refs),
003 (the clip URL convention the harvested slugs resolve against), and 004 (the route + render
that serves the compiled page). It is a prerequisite for 006 and 007: those weapon pages reference
the same monster and reuse the move/state vocabulary this page locks in. It deliberately precedes
008 (SEO + i18n + full E2E) and does not depend on it.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] A real content file exists at `content/wilds/chatacabra/index.mdx` (the source of truth),
      distinct from the existing `test/fixtures/` copy.
- [ ] Its frontmatter sets `name: Chatacabra` (and any other fields 002 requires), so it ingests
      as the Chatacabra monster for game `wilds`, slug `chatacabra`.
- [ ] The page is structured with the conventional sections, in order: a tactical summary, a
      *Lectura del combate* prose section, an *Estados* section (enraged/exhausted), *Baiting*, and
      *Patrones*, followed by a curated set of key moves.
- [ ] Each curated move uses the locked anatomy — `aviso`, `cómo funciona`, `qué vigilar` — and
      embeds a `<Clip slug="…" />` reference (placeholder slug allowed).
- [ ] All section/anatomy headings and copy use the locked Spanish vocabulary from ARCHITECTURE
      (`ventana de castigo`, `aviso`, `cómo funciona`, `qué vigilar`, etc.); no English chrome.
- [ ] Factual game content that isn't yet verified is explicitly marked as TODO (a consistent,
      greppable marker) rather than guessed.
- [ ] `pnpm ingest` over `content/` compiles the file and upserts the monster + its harvested clip
      references without error (idempotent on re-run).
- [ ] The page renders at `/guias/wilds/chatacabra` through the 004 route: sections appear in
      order, and each `<Clip>` renders as a `<video>` (pointing at the convention-derived CDN URL)
      or the graceful placeholder when the WebM isn't uploaded yet.

### Non-Goals <!-- required -->

- **Weapon-specific content** — Longsword (006) and Greatsword (007). 005 authors only the general
  `index.mdx`; no `longsword.mdx` / `greatsword.mdx`.
- **Rich design components** — StatBlock, MoveCard, and the punish-window timeline bar remain
  deferred. 005 is plain markdown + `<Clip>` only.
- **Verified game facts and real clips** — accurate Chatacabra move data and recorded/uploaded
  WebM clips are a later fill pass; 005 ships structure with TODO prose and placeholder slugs.
- **SEO / i18n polish and the full E2E suite** — 008.
- **A publish gate for the general page** — `published_at` lives on `punish_guides`, not
  `monsters`, so the general page has no gate. With TODO content this is acceptable only because
  there is no public deploy yet; it simply must not be deployed to a public site until filled.

### Open Questions <!-- optional -->

- Exact curated move list for Chatacabra (which moves count as "key") is deferred to the fill pass;
  the structure must accommodate adding/removing moves without rework.
- Whether stat-block fields (clase, elemento, hábitat, …) are captured now as plain prose/list or
  left for the StatBlock component in a later feature — defaulting to plain prose/list here since
  no component is built.

---

## How <!-- required -->

### Approach <!-- required -->

Create `content/wilds/chatacabra/index.mdx` — the first file under the real `content/` root that
ARCHITECTURE names as the source of truth (today only `test/fixtures/content` exists). Author it as
MDX:

- **Frontmatter** matching what 002 requires for a general page (at minimum `name: Chatacabra`;
  mirror the fixture's frontmatter shape).
- **Body** using standard markdown headings/prose/lists plus `<Clip slug="…" />` references — no
  custom components. Section order: tactical summary → `## Lectura del combate` → `## Estados` →
  `## Baiting` → `## Patrones` → a `## Movimientos clave` block with one subsection per curated
  move, each carrying `aviso` / `cómo funciona` / `qué vigilar` and a `<Clip>`.
- **Vocabulary** locked to ARCHITECTURE's Spanish conventions; **factual gaps marked TODO** with a
  single consistent marker (e.g. `> TODO:`), so the fill pass can grep them.
- **Clips** referenced by descriptive placeholder slugs (e.g. `salto-bilis`); the 002 pipeline
  harvests them and writes `clips` rows whose URLs follow the 003 convention. The WebMs need not
  exist yet — 004 renders a `<video>` at the derived URL and degrades gracefully until upload.

Ingest is exercised against `content/` (`pnpm ingest`) and the page is viewed through the existing
004 route to confirm it compiles, upserts, and renders.

### Confidence <!-- required -->

**Level:** High

**Rationale:** The mechanism — compile MDX, harvest `<Clip>`, upsert, SSR-render — is fully proven
by 002 and 004 against the Chatacabra fixture, which already contains exactly these constructs
(`name` frontmatter, prose, a `<Clip>`). 005 adds a real, larger file of the same shape in the
real `content/` directory. The only genuine uncertainty is content accuracy, and that is
deliberately removed from scope via TODO markers. No spike is needed.

### Key Decisions <!-- optional -->

- **Author under `content/`, not `test/fixtures/`.** `content/` is the source of truth; the fixture
  stays a fixture. This is the first real population of `content/`.
- **Structure-first with TODO prose** over drafting unverified facts — keeps wrong game data out of
  the repo while letting the layout, vocabulary, and pipeline wiring land now.
- **Placeholder clip slugs** over blocking on recorded WebM — lets authoring proceed; clips fill in
  later through the 003 flow, and 004's graceful degradation covers the gap.
- **No new components** — confirmed scope; the design components stay deferred to keep 005 a pure
  content/authoring step.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest for the pipeline, Playwright for the core routes,
TypeScript first):

- **Vitest — ingest of real content:** a test that runs `ingest({ contentRoot: "content" })` (or
  points at the new file) and asserts the Chatacabra monster upserts with non-empty
  `overview_content` and that its placeholder `<Clip>` slugs produce `clips` rows. Reuses the
  existing truncate-per-test harness.
- **Render check:** assert the compiled `overview_content` renders the conventional section
  headings in order (e.g. *Lectura del combate*, *Estados*, *Movimientos clave*) and at least one
  `<video>`/placeholder — extending the 004 render test, or a Playwright assertion on
  `/guias/wilds/chatacabra` against the seeded content.
- **Structural lint (lightweight):** a check (test or documented manual step) that every authored
  move includes `aviso` / `cómo funciona` / `qué vigilar`, and that TODO markers are the agreed
  greppable token — so the fill pass has a clear worklist.
- **TypeScript / ingest validation** from 002 continues to guard frontmatter and `<Clip>` shape.
