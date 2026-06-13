# Spec: Media Hosting + Clip Upload/Reference Flow

| Field | Value |
|---|---|
| id | 003 |
| status | approved |
| created | 2026-06-13 |

---

## Why <!-- required -->

WebM clips are the product's core teaching device, and ARCHITECTURE puts them on object storage
behind a CDN, referenced by URL — never in the repo or the DB body. Feature 002 shipped the ingest
pipeline but left `clips.url` as author-provided placeholders. This feature gets the actual WebM
bytes onto a CDN (Cloudflare R2) and makes each clip's URL **canonical and automatic**, so guides
render real video instead of dead links — without authors hand-managing URLs.

### Consumer Impact <!-- required -->

- **Content authors** — run `pnpm clips:upload` to publish local WebM, and reference clips with a
  bare `<Clip slug="…"/>` in the body. No URLs, no frontmatter bookkeeping.
- **Ingest pipeline (002)** — modified by this feature to harvest `<Clip>` usages from the body and
  derive each clip's URL by convention, then write `clips` rows.
- **Route loaders / render (004)** — read `clips.url` (now real CDN URLs) to play video.
- The end hunter ultimately gets the looped WebM streamed from the CDN.

### Roadmap Fit <!-- required -->

Third in the v1 sequence. Depends on **001** (the `clips` table) and **002** (the ingest pipeline,
which this feature modifies). Feeds **004** (render reads `clips.url`) and **005–007** (real
Chatacabra clips). It is the last piece of the content pipeline before rendering.

---

## What <!-- required -->

### Acceptance Criteria <!-- required -->

- [ ] `pnpm clips:upload` walks a gitignored `media/{game}/{monster}/{slug}.webm` tree and uploads
      each file to the bucket at key `{game}/{monster}/{slug}.webm` with `Content-Type: video/webm`.
      Idempotent — re-uploading overwrites, never duplicates.
- [ ] A thin S3-compatible client module is configured entirely from env (R2 endpoint/account,
      access key, secret, bucket) and works against any S3-compatible endpoint.
- [ ] A URL-derivation helper produces `clips.url = {CDN_BASE_URL}/{game}/{monster}/{slug}.webm`.
- [ ] **Ingest (002) is updated**: the frontmatter `clips:` list is removed; the pipeline harvests
      every `<Clip slug="…" caption="…"?/>` from the body (slug must be a literal), derives the URL,
      and upserts one `clips` row per `(monster, slug)` with `caption` from the prop (nullable) and
      `punish_guide_id` always NULL (clips are monster-level assets).
- [ ] A slug referenced multiple times within a monster's files yields a single clip row; if two
      `<Clip>` with the same slug declare **different** captions, ingest aborts (ambiguous).
- [ ] A non-literal `<Clip slug={expr}/>` still aborts (can't derive a key/URL).
- [ ] `.env.example` documents the R2 credentials, bucket, and `CDN_BASE_URL`; `media/` is
      gitignored so WebM bytes never enter git.
- [ ] Existing ingest tests are updated to the body-only clip model and pass; the upload client and
      URL helper are unit-tested.

### Non-Goals <!-- required -->

- No production bucket / custom-domain / DNS provisioning — that is a deploy concern; everything
  here is config-driven via env.
- No `<Clip>` render component, SSR, or `published_at` enforcement (004).
- No transcoding, compression, thumbnailing, or format conversion — authors supply ready-to-serve
  WebM.
- No private/signed URLs or access control — clips are public-read via the CDN.
- No deletion of stale objects from the bucket when a clip is removed (mirrors 002's upsert-only
  stance; bucket reconciliation deferred).
- No real Chatacabra clips (005–007). Tests use fixtures/mocks.

### Open Questions <!-- optional -->

None blocking. Provider (R2), URL strategy (convention-derived), upload scope (CLI + client),
clip declaration (body-only `<Clip>`), and `punish_guide_id` (always NULL) were resolved in
dialogue.

---

## How <!-- required -->

### Approach <!-- required -->

**Storage client.** A thin wrapper (`src/media/client.ts`) over `@aws-sdk/client-s3`, configured
from env: `R2_ACCOUNT_ID`/endpoint, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Using
the S3 API keeps it portable (R2 today, any S3-compatible endpoint later). Throws clearly if config
is missing.

**Upload CLI.** `src/media/upload.ts` (`pnpm clips:upload`) walks `media/`, and for each
`{game}/{monster}/{slug}.webm` issues a `PutObject` to key `{game}/{monster}/{slug}.webm` with
`ContentType: video/webm`. Idempotent overwrite; prints a per-file + total count; closes cleanly.

**URL convention.** `src/media/url.ts` exports `clipUrl(game, monster, slug)` →
`${CDN_BASE_URL}/${game}/${monster}/${slug}.webm`. `CDN_BASE_URL` is the R2 public bucket / CDN
origin (env). This single helper is the contract shared by ingest (writes the URL) and the upload
key layout (writes the bytes), so they can't drift.

**Ingest changes (modifies 002, `src/ingest/`).**
- `parse.ts`: drop the `clips` field from both frontmatter zod schemas.
- `compile.ts`: the existing `collectClipSlugs` plugin becomes `collectClips`, capturing each
  `<Clip>`'s literal `slug` **and** optional literal `caption`. Non-literal slug → issue (abort, as
  today). Dedupe by slug within a file; conflicting captions for one slug → abort.
- `validate.ts`: remove `validateClipReferences` and `validateNoDuplicateClipSlugs` (no frontmatter
  list to match; reuse now allowed). Add a per-monster check: same slug with conflicting captions
  across files → abort.
- `upsert.ts`: derive `url` via `clipUrl(...)`; set `caption` from the harvested prop;
  `punishGuideId: null`. Upsert on `(monster_id, slug)` as before.
- `ingest.ts`/`types.ts`: thread harvested clips (slug + caption) through instead of frontmatter
  clips.

**Data flow:** author drops WebM in `media/…` and `<Clip slug>` in MDX → `pnpm clips:upload` pushes
bytes to R2 at the conventional key → `pnpm ingest` derives the matching URL and writes `clips`
rows → 004 reads `clips.url` and streams from the CDN.

### Confidence <!-- required -->

**Level:** High

**Rationale:** The S3 `PutObject` client and a deterministic URL convention are well-trodden, and
R2 is S3-compatible, so no provider-specific risk in code. Unit tests mock the S3 client (no
network). The compile→run render contract was already de-risked in 002 and is untouched here. The
only deferred unknown — the production bucket and public/custom-domain — is config-driven
(`CDN_BASE_URL`) and belongs to deploy, not this feature. No spike needed.

### Key Decisions <!-- optional -->

- **Cloudflare R2 via the S3 API** — zero egress (right for looped video), CDN built in, and the
  S3 client keeps it portable.
- **Convention-derived URLs** — `{CDN_BASE_URL}/{game}/{monster}/{slug}.webm`; one helper shared by
  upload + ingest so bytes and URLs never drift.
- **Body-only `<Clip>` declaration** — no frontmatter clips list; authors just drop tags. Simplest
  authoring; supports any number of clips per page.
- **`punish_guide_id` always NULL** — clips are monster-level assets; reuse across the general and
  weapon pages is free. (Drops 002's cross-file-dup-slug error.)
- **Upload CLI is content-agnostic** — it uploads whatever is under `media/`, not driven by parsing
  `content/`. Simpler; a content-vs-media reconciliation check is deferred.

### Testing Approach <!-- required -->

Per OVERVIEW's pragmatic posture (Vitest; TypeScript first). Reuses the 001 test DB + `TRUNCATE`
isolation and the `.cause.code` finding for the ingest tests.

- **URL helper** — `clipUrl` returns the exact convention for representative inputs; respects
  `CDN_BASE_URL` with/without a trailing slash.
- **Upload client (mocked)** — with `aws-sdk-client-mock`, assert `clips:upload` issues a
  `PutObject` per discovered file, with the correct key and `ContentType: video/webm`; missing env
  throws; no network.
- **Ingest, body-only model** — fixtures with `<Clip slug caption?>` in the body (no frontmatter
  clips): assert clip rows have the derived URL, caption from the prop (and NULL when omitted),
  `punish_guide_id` NULL, and one row per `(monster, slug)` when a slug repeats.
- **Fail-fast** — non-literal slug aborts; same slug with conflicting captions aborts.
- Existing 002 clip tests/fixtures are migrated to the new model (frontmatter `clips:` removed).
