# Overview

<!-- status: draft | approved -->
| Field | Value |
|---|---|
| status | approved |
| created | 2026-06-13 |

## Product Summary <!-- required -->

A Spanish-language Monster Hunter guide site focused on **"ventanas de castigo"** (punishing
windows) — teaching players when and how to attack a monster safely for maximum damage. Each
monster has a weapon-agnostic general guide (move set, what triggers specific attacks, enraged/
exhausted states, baiting) plus weapon-specific punish guides for Longsword and Greatsword.
Content is authored as MDX with looped WebM clips demonstrating monster moves and hunter
attacks, ingested into a database, and served via SSR.

## Target Consumer <!-- required -->

Spanish-speaking Monster Hunter players, roughly intermediate to advanced, who main Longsword or
Greatsword and want to sharpen their punish timing. They already know the basics of the hunt and
are looking to optimize: which monster actions to bait or wait for, and exactly how to react.

## Job To Be Done <!-- required -->

Help the hunter learn which monster actions create safe attack windows and exactly how to punish
them — LS counters (Sakura Slash windows, Iai timing) or GS charged attacks and offsets (TCS
windows, charge timing) — with video showing the timing rather than describing it in prose.

## Non-Goals <!-- required -->

- Not a full wiki — no builds, decoration/skill optimizers, or drop/material tables.
- Not a community product — no user accounts, comments, forums, or UGC.
- Not covering every weapon at launch — Longsword and Greatsword only.
- Not multi-locale at launch — Spanish only.
- Not a real-time/overlay tool — it is reference content, consumed before or between hunts.

## Tech Stack <!-- required -->

- **TanStack Start** — full-stack React framework, SSR.
- **Nitro** — server/deployment runtime under TanStack Start.
- **PostgreSQL** — read store for ingested guide content and metadata.
- **MDX** — authoring format for guide content; source of truth lives in the repo.
- **WebM** — looped, muted, autoplay clips for moves/attacks; hosted on object storage + CDN.
- **TypeScript** throughout.

## Testing Suite <!-- required -->

Pragmatic posture (this section is load-bearing — decision records cite it as evidence):

- **Vitest** unit tests for the MDX ingest/parse pipeline and DB queries.
- **Playwright** E2E tests on the core guide-rendering routes (general + each weapon page).
- TypeScript as the first line of defense; no exhaustive coverage mandate.

## Open Questions <!-- optional -->

- Deploy/hosting target for Nitro and the Postgres host are not yet chosen.
- Whether clip metadata needs full localization fields (captions/alt text) beyond Spanish.
- Whether `published_at` implies a draft/preview workflow, or is just a display date.
