import type { CompiledFile } from "./types.js";

/** Every `<Clip slug>` referenced in the body must be declared in that file's frontmatter clips. */
export function validateClipReferences(file: CompiledFile): void {
  const declared = new Set(file.frontmatter.clips.map((c) => c.slug));
  for (const slug of file.referencedSlugs) {
    if (!declared.has(slug)) {
      throw new Error(
        `${file.absPath}: <Clip slug="${slug}"/> has no matching entry in frontmatter clips`,
      );
    }
  }
}

/**
 * Clip slugs are unique per monster (`clips(monster_id, slug)`), so a slug
 * declared in two files under the same monster would silently clobber one row.
 * Reject it instead.
 */
export function validateNoDuplicateClipSlugs(
  game: string,
  monsterSlug: string,
  files: CompiledFile[],
): void {
  const seen = new Map<string, string>(); // slug → declaring file
  for (const file of files) {
    for (const clip of file.frontmatter.clips) {
      const prev = seen.get(clip.slug);
      if (prev) {
        throw new Error(
          `${game}/${monsterSlug}: clip slug "${clip.slug}" declared in both ${prev} and ${file.absPath}`,
        );
      }
      seen.set(clip.slug, file.absPath);
    }
  }
}
