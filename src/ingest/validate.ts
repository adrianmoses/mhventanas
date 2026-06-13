import type { CompiledFile, ResolvedClip } from "./types.js";

/**
 * Merge all `<Clip>` references across a monster's files into one row per slug.
 * Clips are monster-level assets (reused freely across the general and weapon
 * pages), so a repeated slug collapses to a single row. A slug declared with
 * two **different** non-empty captions is ambiguous → abort; a captioned and an
 * uncaptioned reference are not a conflict (the caption wins).
 */
export function mergeMonsterClips(
  game: string,
  monsterSlug: string,
  files: CompiledFile[],
): ResolvedClip[] {
  const captionBySlug = new Map<string, string | null>();

  for (const file of files) {
    for (const clip of file.clips) {
      const existing = captionBySlug.get(clip.slug);
      const incoming = clip.caption ?? null;

      if (existing === undefined) {
        captionBySlug.set(clip.slug, incoming);
        continue;
      }
      if (existing !== null && incoming !== null && existing !== incoming) {
        throw new Error(
          `${game}/${monsterSlug}: clip "${clip.slug}" has conflicting captions ("${existing}" vs "${incoming}")`,
        );
      }
      // Prefer a present caption over null.
      if (existing === null && incoming !== null) {
        captionBySlug.set(clip.slug, incoming);
      }
    }
  }

  return [...captionBySlug].map(([slug, caption]) => ({ slug, caption }));
}
