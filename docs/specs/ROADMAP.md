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
| 003 | Media hosting (R2/S3 + CDN) + clip upload/reference flow | in-progress | [spec](003-media-hosting/spec.md) |
| 004 | Routing + guide rendering (`/guias/:game/:monster[/:weapon]`, SSR) | planned | — |
| 005 | Chatacabra general page content (estados, baiting, patrones) | planned | — |
| 006 | Chatacabra Longsword page content (contras, Sakura Slash, Iai) | planned | — |
| 007 | Chatacabra Greatsword page content (offsets, TCS, tiempos de carga) | planned | — |
| 008 | SEO + i18n polish + Playwright E2E on core routes | planned | — |

## Status Values

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
