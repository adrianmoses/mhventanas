import { clips, db, monsters, punishGuides } from "../db/index.js";
import type { ClipEntry } from "./parse.js";
import type { MonsterRecord, Weapon } from "./types.js";

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

    const guideIdByWeapon = new Map<Weapon, number>();
    for (const w of rec.weapons) {
      const [guide] = await tx
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
        })
        .returning({ id: punishGuides.id });
      guideIdByWeapon.set(w.weapon, guide!.id);
    }

    let clipCount = 0;
    const upsertClip = async (clip: ClipEntry, punishGuideId: number | null): Promise<void> => {
      await tx
        .insert(clips)
        .values({
          monsterId,
          punishGuideId,
          slug: clip.slug,
          url: clip.url,
          caption: clip.caption ?? null,
        })
        .onConflictDoUpdate({
          target: [clips.monsterId, clips.slug],
          set: { url: clip.url, caption: clip.caption ?? null, punishGuideId },
        });
      clipCount += 1;
    };

    for (const clip of general.frontmatter.clips) {
      await upsertClip(clip, null);
    }
    for (const w of rec.weapons) {
      const guideId = guideIdByWeapon.get(w.weapon)!;
      for (const clip of w.frontmatter.clips) {
        await upsertClip(clip, guideId);
      }
    }

    return { guides: rec.weapons.length, clips: clipCount };
  });
}
