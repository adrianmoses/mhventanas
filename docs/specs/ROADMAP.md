# Roadmap

<!-- status: draft | approved -->
| Field | Value |
|---|---|
| status | approved |
| created | 2026-06-13 |

## Features

v1 milestone: **Chatacabra (Wilds)** shipped end-to-end — general + Longsword + Greatsword pages
through the real content pipeline. Proves the full vertical slice before scaling content.

| ID | Feature | Status | Spec |
|---|---|---|---|
| 001 | Database schema + migrations (monsters, punish_guides, clips with slugs) | implemented | [spec](001-db-schema-migrations/spec.md) · [decision](001-db-schema-migrations/decision.md) |
| 002 | MDX ingest pipeline (compile MDX, `<Clip>` component, idempotent upsert) | implemented | [spec](002-mdx-ingest-pipeline/spec.md) · [decision](002-mdx-ingest-pipeline/decision.md) |
| 003 | Media hosting (R2/S3 + CDN) + clip upload/reference flow | implemented | [spec](003-media-hosting/spec.md) · [decision](003-media-hosting/decision.md) |
| 004 | Routing + guide rendering (`/guias/:game/:monster[/:weapon]`, SSR) | implemented | [spec](004-routing-guide-rendering/spec.md) · [decision](004-routing-guide-rendering/decision.md) |
| 005 | Chatacabra general page content (estados, baiting, patrones) | implemented | [spec](005-chatacabra-general-content/spec.md) · [decision](005-chatacabra-general-content/decision.md) |
| 006 | Chatacabra Longsword page content (contras, Sakura Slash, Iai) | implemented | [spec](006-chatacabra-longsword-content/spec.md) · [decision](006-chatacabra-longsword-content/decision.md) |
| 007 | Chatacabra Greatsword page content (offsets, TCS, tiempos de carga) | implemented | [spec](007-chatacabra-greatsword-content/spec.md) · [decision](007-chatacabra-greatsword-content/decision.md) |
| 008 | SEO + i18n polish + Playwright E2E on core routes | planned | — |

## Backlog / Deferred

Surfaced follow-up candidates not yet committed to the numbered v1 sequence. Each names its origin.

| ID | Item | Status | Origin |
|---|---|---|---|
| B1 | Content publish-readiness checks — fail CI when a to-be-published guide still contains a `TODO` marker, and flag `<Clip>` slugs that have no uploaded WebM. De-risks the content fill pass before any public deploy. | proposed | [005 decision](005-chatacabra-general-content/decision.md) |
| B2 | General-page visibility gate — `published_at` is weapon-only (`punish_guides`), so a monster overview page with draft/`TODO` content cannot be hidden. Only needed if a draft workflow for general pages is wanted; ties to the OVERVIEW open question on `published_at` semantics. | proposed | [005 decision](005-chatacabra-general-content/decision.md) |

## Status Values

- `proposed` — surfaced as a candidate (backlog); not yet committed or sequenced
- `planned` — not yet started
- `in-progress` — spec written, implementation underway
- `implemented` — decision record complete
- `deprecated` — removed from product

## Revision History

| Date | Change |
|---|---|
| 2026-06-13 | Initial roadmap created |
| 2026-06-13 | 001 specced; status → in-progress |
| 2026-06-13 | 001 implemented; decision record added; status → implemented |
| 2026-06-13 | 002 specced; status → in-progress |
| 2026-06-13 | 002 implemented; decision record added; status → implemented |
| 2026-06-13 | 003 specced; status → in-progress |
| 2026-06-13 | 003 implemented; decision record added; status → implemented |
| 2026-06-14 | 004 specced; status → in-progress |
| 2026-06-14 | 004 implemented; decision record added; status → implemented |
| 2026-06-14 | 005 specced; status → in-progress |
| 2026-06-14 | 005 implemented; decision record added; status → implemented |
| 2026-06-14 | Backlog added (B1, B2) from 005 decision spec gaps |
| 2026-06-14 | 006 + 007 specced; status → in-progress |
| 2026-06-14 | 006 + 007 implemented; decision records added; status → implemented |
