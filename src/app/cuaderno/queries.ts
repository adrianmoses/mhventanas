import { asc, eq, sql } from "drizzle-orm";
import { db, hunts } from "../../db/index.js";
import type { Hunt } from "./stats.js";
import type { HuntValues } from "./validate.js";

// Every column the pages use; created_at/updated_at stay server-side.
const huntColumns = {
  id: hunts.id,
  huntedOn: hunts.huntedOn,
  monsterName: hunts.monsterName,
  monsterSlug: hunts.monsterSlug,
  rank: hunts.rank,
  variant: hunts.variant,
  weapon: hunts.weapon,
  timeSeconds: hunts.timeSeconds,
  carts: hunts.carts,
  result: hunts.result,
  build: hunts.build,
  hits: hunts.hits,
  causes: hunts.causes,
  cartCause: hunts.cartCause,
  learned: hunts.learned,
  weaknesses: hunts.weaknesses,
  missingItems: hunts.missingItems,
  prep: hunts.prep,
  wentWell: hunts.wentWell,
  mainError: hunts.mainError,
  nextGoal: hunts.nextGoal,
};

export function listHunts(): Promise<Hunt[]> {
  return db.select(huntColumns).from(hunts);
}

export function listHuntsByMonster(slug: string): Promise<Hunt[]> {
  return db.select(huntColumns).from(hunts).where(eq(hunts.monsterSlug, slug));
}

export async function getHunt(id: number): Promise<Hunt | null> {
  const [row] = await db.select(huntColumns).from(hunts).where(eq(hunts.id, id));
  return row ?? null;
}

/** Distinct monster names already in the log, for the form's suggestions. */
export async function monsterNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: hunts.monsterName })
    .from(hunts)
    .orderBy(asc(hunts.monsterName));
  return rows.map((r) => r.name);
}

export async function insertHunt(values: HuntValues): Promise<number> {
  const [row] = await db.insert(hunts).values(values).returning({ id: hunts.id });
  return row!.id;
}

/** Returns false when no hunt has that id. */
export async function updateHunt(id: number, values: HuntValues): Promise<boolean> {
  const rows = await db
    .update(hunts)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(hunts.id, id))
    .returning({ id: hunts.id });
  return rows.length > 0;
}

export async function deleteHunt(id: number): Promise<boolean> {
  const rows = await db.delete(hunts).where(eq(hunts.id, id)).returning({ id: hunts.id });
  return rows.length > 0;
}
