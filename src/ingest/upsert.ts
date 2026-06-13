import { clips, db, monsters, punishGuides } from "../db/index.js";
import { clipUrl } from "../media/url.js";
import type { MonsterRecord } from "./types.js";

export interface UpsertCounts {
  guides: number;
  clips: number;
}

/**
 * Write one monster's general guide, weapon guides, and clips atomically.
 * Idempotent: upserts on the 001 unique keys; `updatedAt` is bumped on update
 * (resolving the write-semantics question the 001 decision record deferred here).
 */
export async function upsertMonster(rec: MonsterRecord): Promise<UpsertCounts> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const general = rec.general;

    const [monster] = await tx
      .insert(monsters)
      .values({
        game: rec.game,
        slug: rec.monsterSlug,
        name: general.frontmatter.name,
        variant: general.frontmatter.variant ?? null,
        overviewContent: general.code,
      })
      .onConflictDoUpdate({
        target: [monsters.game, monsters.slug],
        set: {
          name: general.frontmatter.name,
          variant: general.frontmatter.variant ?? null,
          overviewContent: general.code,
          updatedAt: now,
        },
      })
      .returning({ id: monsters.id });
    const monsterId = monster!.id;

    for (const w of rec.weapons) {
      await tx
        .insert(punishGuides)
        .values({
          monsterId,
          weaponType: w.weapon,
          content: w.code,
          publishedAt: w.frontmatter.published_at ?? null,
        })
        .onConflictDoUpdate({
          target: [punishGuides.monsterId, punishGuides.weaponType],
          set: {
            content: w.code,
            publishedAt: w.frontmatter.published_at ?? null,
            updatedAt: now,
          },
        });
    }

    // Clips are monster-level assets; URL derived by convention, punish_guide_id NULL.
    for (const clip of rec.clips) {
      const url = clipUrl(rec.game, rec.monsterSlug, clip.slug);
      await tx
        .insert(clips)
        .values({
          monsterId,
          punishGuideId: null,
          slug: clip.slug,
          url,
          caption: clip.caption,
        })
        .onConflictDoUpdate({
          target: [clips.monsterId, clips.slug],
          set: { url, caption: clip.caption, punishGuideId: null },
        });
    }

    return { guides: rec.weapons.length, clips: rec.clips.length };
  });
}
