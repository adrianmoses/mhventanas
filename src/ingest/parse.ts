import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import { z } from "zod";
import type { DiscoveredFile, ParsedFile } from "./types.js";

const clipEntry = z.object({
  slug: z.string().min(1),
  // Not .url() — clip URLs may be placeholders until 003 wires the real CDN.
  url: z.string().min(1),
  caption: z.string().optional(),
});

export const generalFrontmatter = z
  .object({
    name: z.string().min(1),
    variant: z.string().optional(),
    clips: z.array(clipEntry).default([]),
  })
  .strict();

export const weaponFrontmatter = z
  .object({
    // Authored as `published_at` (snake); mapped to the DB `publishedAt` column.
    published_at: z.coerce.date().optional(),
    clips: z.array(clipEntry).default([]),
  })
  .strict();

export type ClipEntry = z.infer<typeof clipEntry>;
export type GeneralFrontmatter = z.infer<typeof generalFrontmatter>;
export type WeaponFrontmatter = z.infer<typeof weaponFrontmatter>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/** Read a discovered file, strip frontmatter, and validate its shape. Throws on invalid input. */
export async function parseFile(file: DiscoveredFile): Promise<ParsedFile> {
  const raw = await readFile(file.absPath, "utf8");
  const { data, content } = matter(raw);

  if (file.kind === "general") {
    const result = generalFrontmatter.safeParse(data);
    if (!result.success) {
      throw new Error(`${file.absPath}: invalid frontmatter — ${formatIssues(result.error)}`);
    }
    return { kind: "general", absPath: file.absPath, game: file.game, monsterSlug: file.monsterSlug, frontmatter: result.data, body: content };
  }

  const result = weaponFrontmatter.safeParse(data);
  if (!result.success) {
    throw new Error(`${file.absPath}: invalid frontmatter — ${formatIssues(result.error)}`);
  }
  return { kind: "weapon", absPath: file.absPath, game: file.game, monsterSlug: file.monsterSlug, weapon: file.weapon!, frontmatter: result.data, body: content };
}
