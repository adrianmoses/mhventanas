# Decision Record: Media Hosting + Clip Upload/Reference Flow

| Field | Value |
|---|---|
| id | 003 |
| status | implemented |
| created | 2026-06-13 |
| spec | [spec.md](./spec.md) |

---

## Context <!-- required -->

002 shipped the ingest pipeline but left `clips.url` as author-provided placeholders and declared
clips in a frontmatter `clips:` list. 003 gets the WebM bytes onto Cloudflare R2 and makes each
clip's URL canonical + automatic, while switching authoring to a **body-only `<Clip>`** model. So
this feature is half new media code and half a **migration of the already-merged 002 ingest**.

Verified during implementation: `@aws-sdk/client-s3` works under ESM/NodeNext with `PutObjectCommand`
alone (no `lib-storage`); R2 wants `region:"auto"` + `forcePathStyle:true` + an explicit `endpoint`;
a Buffer `Body` from `fs.readFile` needs no `ContentLength`; `aws-sdk-client-mock@4` mocks the S3
client cleanly in Vitest. R2's S3 API endpoint is distinct from the public serving URL — hence a
separate `CDN_BASE_URL`. The build reused 002's CLI pattern (`import.meta.url` guard) and the
existing test DB + `TRUNCATE` isolation.

## Decision <!-- required -->

Added a `src/media/` module: a URL-convention helper (`clipUrl`/`clipKey`), an env-configured
S3-compatible R2 client, and a `pnpm clips:upload` CLI that walks a gitignored
`media/{game}/{monster}/{slug}.webm` tree and `PutObject`s each file to the mirrored key with
`Content-Type: video/webm` (idempotent). Migrated the 002 ingest to harvest `<Clip slug caption?>`
from the MDX body (frontmatter `clips:` removed), derive `clips.url` via the shared `clipUrl` helper,
merge to one row per `(monster, slug)`, and set `punish_guide_id` always NULL — clips are
monster-level assets, freely reused across the general and weapon pages. Production bucket/domain
provisioning is config-driven (`CDN_BASE_URL`) and deferred to deploy; nothing here requires a live
bucket (tests mock the client).

---

## Alternatives Considered <!-- required -->

### Provider (settled in the spec, restated)

**Option A — Cloudflare R2 via the S3 API:** zero egress, CDN built in, S3-compatible.
- Pros: right cost profile for looped video; portable code.
- Cons: R2-specific client quirks (`region:"auto"`, `forcePathStyle`).

**Option B — AWS S3 + CloudFront.** Mature but per-GB egress + more moving parts.

**Chosen:** R2, accessed through the S3 client so the code stays provider-agnostic.

### How `clips.url` is determined

**Option A — convention-derived** (`{CDN_BASE_URL}/{game}/{monster}/{slug}.webm`).
- Pros: one helper shared by upload key + ingest URL → they can't drift; no author bookkeeping.
- Cons: a rename means re-upload + re-ingest (acceptable).

**Option B — explicit URLs in frontmatter** (002's stopgap). Author hand-copies; drift risk.

**Chosen:** A.

### Clip declaration model

**Option A — body-only `<Clip slug caption?>`**, harvested from the MDX.
- Pros: simplest authoring; any number of clips; no frontmatter list to maintain.
- Cons: caption lives inline; needs cross-file caption-consistency handling.

**Option B — keep the frontmatter `clips:` registry** with optional/derived URL.
- Pros: explicit registry, caption separate from layout.
- Cons: declare-in-list *and* use-the-tag duplication.

**Chosen:** A (user decision). Removed 002's frontmatter `clips:`, `validateClipReferences`, and
`validateNoDuplicateClipSlugs`.

### `punish_guide_id` for clips

**Option A — always NULL** (clips are monster-level assets).
- Pros: reuse across general + weapon pages is free; no ambiguity when a slug appears in two files.
- Cons: loses per-guide linkage (unused so far).

**Option B — link to a guide when used exclusively in one weapon file.** More semantics, more code.

**Chosen:** A (user decision).

### Upload `Body`

**Buffer (`fs.readFile`)** over a stream — streams need `ContentLength`; Buffer is simpler and fine
for clip-sized files.

---

## Tradeoffs <!-- required -->

- **Optimised for:** a single source of truth for clip URLs (the convention helper) and the
  simplest possible authoring (drop a tag, drop a file). Tests need no cloud.
- **Given up / accepted:** two new deps (`@aws-sdk/client-s3`, `aws-sdk-client-mock`); a URL rename
  requires re-upload + re-ingest; the upload CLI is content-agnostic (uploads whatever is under
  `media/`, no content-vs-media reconciliation); no stale-object cleanup; clips are public-read (no
  signed URLs); `punish_guide_id` linkage is unused.

---

### Spec Divergence <!-- optional -->

Implementation matched the spec. The plan resolved several under-specified points as deliberate
clarifications (none contradict the spec):

| Spec Said | What Was Built | Reason |
|---|---|---|
| R2 credentials + bucket + `CDN_BASE_URL` (names unspecified) | `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `CDN_BASE_URL` | Concrete, R2-clear names |
| Conflicting captions for one slug abort | A captioned + an uncaptioned `<Clip>` is **not** a conflict (caption wins); non-literal `caption` ignored | Only `slug` must be literal; captions are cosmetic |
| `media/` gitignored | Root-anchored `/media/` | So `test/fixtures/media/` stays tracked |

No divergence in provider, URL convention, body-only model, upload behavior, or `punish_guide_id`.

---

## Spec Gaps Exposed <!-- optional -->

- **`.gitignore` anchoring** — a bare `media/` would have ignored the test WebM fixtures; root
  anchoring (`/media/`) was required. Worth remembering for future asset dirs.
- **Dev `.env` drift** — the local `.env` predated 003's new vars; `CDN_BASE_URL` had to be added
  for the end-to-end check. `.env.example` is the tracked source of truth.
- **Empty/absent frontmatter** — weapon files with no `published_at` can omit frontmatter entirely;
  `gray-matter` + the `.strict()` schema accept `{}`.

---

## Test Evidence <!-- required -->

`pnpm typecheck` (`tsc --noEmit`) exits 0. End-to-end `pnpm ingest` against the dev DB (with
`CDN_BASE_URL=https://cdn.test`) wrote derived URLs and confirmed the model:

```
contraataque-cabeza | https://cdn.test/wilds/chatacabra/contraataque-cabeza.webm | guide_null=t |
offset-tackle       | https://cdn.test/wilds/chatacabra/offset-tackle.webm       | guide_null=t |
salto-bilis         | https://cdn.test/wilds/chatacabra/salto-bilis.webm         | guide_null=t | Salto con bilis
```

Full Vitest suite — 27 passed across 11 files (8 from 001, the 002 ingest tests migrated to the
body-only model, plus the new media tests):

```
 ✓ test/media/url.test.ts > clipUrl > derives the canonical convention URL
 ✓ test/media/url.test.ts > clipUrl > tolerates a trailing slash on the base
 ✓ test/media/url.test.ts > clipUrl > throws when CDN_BASE_URL is unset
 ✓ test/media/url.test.ts > clipKey > mirrors the URL path without the host
 ✓ test/media/upload.test.ts > uploads each .webm to a mirrored key with video/webm content type
 ✓ test/media/upload.test.ts > uploads nothing for a missing media root
 ✓ test/media/upload.test.ts > throws when R2 config is missing
 ✓ test/ingest/clips.test.ts > harvests <Clip> tags, derives URLs, and keeps clips monster-level
 ✓ test/ingest/validation.test.ts > rejects the same clip slug declared with conflicting captions
 ✓ test/ingest/validation.test.ts > rejects an unknown weapon filename
 ✓ test/ingest/validation.test.ts > rejects a weapon file whose monster has no index.mdx
 ✓ test/ingest/validation.test.ts > rejects missing required frontmatter (name)
 ✓ test/ingest/validation.test.ts > rejects uncompilable MDX
 … (general/weapon/idempotency/edit-in-place/roundtrip + 001 schema/client tests also pass)
 Test Files  11 passed (11)
      Tests  27 passed (27)
```
