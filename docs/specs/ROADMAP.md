# Roadmap

<!-- status: draft | approved -->
| Field | Value |
|---|---|
| status | approved |
| created | 2026-06-13 |

## Features

v1 milestone: **Chatacabra (Wilds)** shipped end-to-end — general + Longsword + Greatsword pages
through the real content pipeline. Proves the full vertical slice before scaling content.

> Note: 009 (homepage navigation) was surfaced after the v1 slice and is recommended **before** 008 —
> the site is currently un-navigable from `/`, so SEO/E2E polish on unreachable pages is premature.

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
| 009 | Homepage monster index + site navigation (DB-driven landing, home link) | implemented | [spec](009-homepage-monster-index/spec.md) · [decision](009-homepage-monster-index/decision.md) |
| 010 | Cuaderno de caza — owner hunt log (public read, login-gated writes, 14 weapons) | implemented | [spec](010-cuaderno-caza/spec.md) · [decision](010-cuaderno-caza/decision.md) |

## Backlog / Deferred

Surfaced follow-up candidates not yet committed to the numbered v1 sequence. Each names its origin.

| ID | Item | Status | Origin |
|---|---|---|---|
| B1 | Content publish-readiness checks — fail CI when a to-be-published guide still contains a `TODO` marker, and flag `<Clip>` slugs that have no uploaded WebM. De-risks the content fill pass before any public deploy. | proposed | [005 decision](005-chatacabra-general-content/decision.md) |
| B2 | General-page visibility gate — `published_at` is weapon-only (`punish_guides`), so a monster overview page with draft/`TODO` content cannot be hidden. Only needed if a draft workflow for general pages is wanted; ties to the OVERVIEW open question on `published_at` semantics. | proposed | [005 decision](005-chatacabra-general-content/decision.md) |

| B3 | Cuaderno login hardening — throttle `/cuaderno/entrar` and/or enforce a minimum `CUADERNO_OWNER_SECRET` length; nothing currently limits brute-force attempts on the single owner secret. | proposed | [010 decision](010-cuaderno-caza/decision.md) |
| B4 | Cuaderno restore + scheduled backup — `hunts` is the only non-rebuildable table; `pnpm hunts:export` exists but there is no `hunts:import` and no schedule. Neon (chosen host) gives point-in-time restore, but its window on low-cost plans is short, so a scheduled export is still wanted. | proposed | [010 decision](010-cuaderno-caza/decision.md) |
| B5 | Fly.io deploy setup — Dockerfile for the Nitro server, `fly.toml` with a `release_command` for `db:migrate` + `ingest`, `fly secrets` for runtime env (Neon direct `DATABASE_URL`), R2 public/CDN domain for `CDN_BASE_URL`, and provisioning the Neon project in the Fly app's region. | implemented | [ARCHITECTURE](ARCHITECTURE.md) · [decision](B5-fly-deploy/decision.md) |

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
| 2026-06-16 | 009 (homepage monster index + navigation) added and specced; status → in-progress; recommended before 008 |
| 2026-06-16 | 009 implemented; decision record added; status → implemented |
| 2026-09-27 | 010 (cuaderno de caza) added and specced; status → in-progress |
| 2026-09-27 | 010 implemented; decision record added; status → implemented |
| 2026-09-27 | Backlog added (B3, B4) from 010 decision spec gaps |
| 2026-09-27 | Deploy target resolved (Fly.io); backlog B5 added for deploy setup |
| 2026-09-27 | Postgres host resolved (Neon); B4 and B5 updated |
| 2026-09-27 | B5 implemented (Dockerfile, fly.toml, release step, README deploy docs); status → implemented |
