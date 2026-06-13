/**
 * Canonical public URL for a clip. The single source of truth shared by the
 * ingest pipeline (which stores it) and the upload key layout (which writes the
 * bytes), so the two can't drift: `{CDN_BASE_URL}/{game}/{monster}/{slug}.webm`.
 */
export function clipUrl(game: string, monster: string, slug: string): string {
  const base = process.env.CDN_BASE_URL;
  if (!base) {
    throw new Error("CDN_BASE_URL is not set (see .env.example)");
  }
  return `${base.replace(/\/+$/, "")}/${game}/${monster}/${slug}.webm`;
}

/** Object-storage key for a clip — mirrors the URL path (no CDN host). */
export function clipKey(game: string, monster: string, slug: string): string {
  return `${game}/${monster}/${slug}.webm`;
}
