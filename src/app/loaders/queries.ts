import { and, eq, isNotNull, isNull, lte, or } from "drizzle-orm";
import { clips, db, monsters, punishGuides, weaponType } from "../../db/index.js";
import type { ClipMap } from "../mdx/Clip.js";

/** The two weapon types covered at launch, in canonical (enum) order. */
export type WeaponType = (typeof weaponType.enumValues)[number];

const WEAPONS: readonly WeaponType[] = weaponType.enumValues;

/** Narrow an arbitrary path segment to a known weapon type. */
export function isWeaponType(value: string): value is WeaponType {
  return (WEAPONS as readonly string[]).includes(value);
}

export interface GeneralData {
  monster: { name: string; slug: string; game: string; variant: string | null };
  /** Compiled general-page MDX function-body, or null if not yet authored. */
  overviewCode: string | null;
  clipMap: ClipMap;
  /** Published weapon guides for this monster, in canonical order. */
  weapons: WeaponType[];
}

export interface WeaponData {
  monster: { name: string; slug: string; game: string };
  weapon: WeaponType;
  /** Compiled weapon-page MDX function-body. */
  contentCode: string;
  clipMap: ClipMap;
}

/** One row of the homepage monster index: enough to render a guide link. */
export interface MonsterIndexEntry {
  name: string;
  slug: string;
  game: string;
  variant: string | null;
}

type ClipRow = { slug: string; url: string; caption: string | null };

function buildClipMap(rows: ClipRow[]): ClipMap {
  const map: ClipMap = {};
  for (const r of rows) map[r.slug] = { url: r.url, caption: r.caption };
  return map;
}

/**
 * A punish guide counts as live only when `publishedAt` is set and not in the
 * future. This is the single gate the loaders enforce — NULL and future
 * timestamps both fail it, so unpublished guides 404 and are dropped from links.
 */
function publishedFilter(now: Date) {
  return and(isNotNull(punishGuides.publishedAt), lte(punishGuides.publishedAt, now));
}

/**
 * Load a monster's general guide by (game, slug). Returns null when the monster
 * does not exist (the route turns that into a 404). Includes the slug→URL clip
 * map and the set of *published* weapon guides for top-of-page links.
 */
export async function loadGeneralData(params: {
  game: string;
  monster: string;
}): Promise<GeneralData | null> {
  const [monster] = await db
    .select()
    .from(monsters)
    .where(and(eq(monsters.game, params.game), eq(monsters.slug, params.monster)))
    .limit(1);
  if (!monster) return null;

  const clipRows = await db
    .select({ slug: clips.slug, url: clips.url, caption: clips.caption })
    .from(clips)
    .where(eq(clips.monsterId, monster.id));

  const guideRows = await db
    .select({ weapon: punishGuides.weaponType })
    .from(punishGuides)
    .where(and(eq(punishGuides.monsterId, monster.id), publishedFilter(new Date())));

  const published = new Set(guideRows.map((g) => g.weapon));
  const weapons = WEAPONS.filter((w) => published.has(w));

  return {
    monster: {
      name: monster.name,
      slug: monster.slug,
      game: monster.game,
      variant: monster.variant,
    },
    overviewCode: monster.overviewContent,
    clipMap: buildClipMap(clipRows),
    weapons,
  };
}

/**
 * List monsters that have a general guide, for the homepage index. Gated on
 * `overviewContent` (a monster without it would link to an empty page) rather
 * than a publish flag — general pages have no `published_at` today. DB-driven so
 * newly ingested monsters appear with no code change. Ordered by game then name
 * for stable output.
 */
export async function loadMonsterIndex(): Promise<MonsterIndexEntry[]> {
  return db
    .select({
      name: monsters.name,
      slug: monsters.slug,
      game: monsters.game,
      variant: monsters.variant,
    })
    .from(monsters)
    .where(isNotNull(monsters.overviewContent))
    .orderBy(monsters.game, monsters.name);
}

/**
 * Load a published weapon punish guide by (game, monster slug, weapon). Returns
 * null when the weapon segment is unknown, the monster is missing, or the guide
 * is absent/unpublished/future-dated — all of which the route turns into a 404.
 * The clip map covers monster-level clips plus any scoped to this guide.
 */
export async function loadWeaponData(params: {
  game: string;
  monster: string;
  weapon: string;
}): Promise<WeaponData | null> {
  if (!isWeaponType(params.weapon)) return null;

  const [monster] = await db
    .select()
    .from(monsters)
    .where(and(eq(monsters.game, params.game), eq(monsters.slug, params.monster)))
    .limit(1);
  if (!monster) return null;

  const [guide] = await db
    .select()
    .from(punishGuides)
    .where(
      and(
        eq(punishGuides.monsterId, monster.id),
        eq(punishGuides.weaponType, params.weapon),
        publishedFilter(new Date()),
      ),
    )
    .limit(1);
  if (!guide) return null;

  const clipRows = await db
    .select({ slug: clips.slug, url: clips.url, caption: clips.caption })
    .from(clips)
    .where(
      and(
        eq(clips.monsterId, monster.id),
        or(isNull(clips.punishGuideId), eq(clips.punishGuideId, guide.id)),
      ),
    );

  return {
    monster: { name: monster.name, slug: monster.slug, game: monster.game },
    weapon: params.weapon,
    contentCode: guide.content,
    clipMap: buildClipMap(clipRows),
  };
}
