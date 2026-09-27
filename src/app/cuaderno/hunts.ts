import { createServerFn } from "@tanstack/react-start";
import * as q from "./queries.js";
import { HUNT_WEAPONS } from "./labels.js";
import type { HuntWeapon } from "./labels.js";
import { requireOwner, isOwner } from "./session.js";
import {
  causeCounts,
  filterHunts,
  monsterRows,
  pendingGoals,
  sortNewestFirst,
  summarize,
  timeTrend,
} from "./stats.js";
import type { HuntFilters } from "./stats.js";
import { firstError, huntInputSchema } from "./validate.js";

/** Narrow an untrusted query-string value to a known weapon. */
export function asWeapon(value: unknown): HuntWeapon | undefined {
  return (HUNT_WEAPONS as readonly unknown[]).includes(value)
    ? (value as HuntWeapon)
    : undefined;
}

function asId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Id no válido");
  return id;
}

// ---- Public reads -------------------------------------------------------

/** Everything the hub renders. Filters apply as in the mockup. */
export const getHub = createServerFn({ method: "GET" })
  .validator((f: { monster?: string; weapon?: string; q?: string }): HuntFilters => ({
    monster: typeof f?.monster === "string" && f.monster ? f.monster : undefined,
    weapon: asWeapon(f?.weapon),
    q: typeof f?.q === "string" && f.q.trim() ? f.q.trim().slice(0, 100) : undefined,
  }))
  .handler(async ({ data: filters }) => {
    const all = sortNewestFirst(await q.listHunts());
    const list = filterHunts(all, filters);
    const monsters = monsterRows(all).map((r) => ({
      slug: r.monsterSlug,
      name: r.monsterName,
    }));
    return {
      isOwner: await isOwner(),
      total: all.length,
      filters,
      entries: list,
      summary: summarize(list),
      causes: causeCounts(list),
      goals: pendingGoals(all),
      // Ignores the monster filter so you can switch monsters from the table.
      monsterRows: monsterRows(filterHunts(all, { weapon: filters.weapon })),
      filterOptions: {
        monsters: monsters.sort((a, b) => a.name.localeCompare(b.name, "es")),
        weapons: HUNT_WEAPONS.filter((w) => all.some((h) => h.weapon === w)),
      },
    };
  });

/** One monster's history; null when the slug has no hunts. */
export const getMonsterPage = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => ({ slug: String(d?.slug ?? "") }))
  .handler(async ({ data }) => {
    const hunts = sortNewestFirst(await q.listHuntsByMonster(data.slug));
    if (!hunts.length) return null;
    return {
      isOwner: await isOwner(),
      monsterName: hunts[0]!.monsterName,
      monsterSlug: data.slug,
      entries: hunts,
      summary: summarize(hunts),
      causes: causeCounts(hunts),
      trend: timeTrend(hunts),
    };
  });

// ---- Form support (the routes are owner-only; the data is public anyway) ----

export const getFormData = createServerFn({ method: "GET" })
  .validator((d: { id?: number }) => ({ id: d?.id == null ? undefined : asId(d.id) }))
  .handler(async ({ data }) => ({
    hunt: data.id ? await q.getHunt(data.id) : null,
    monsterNames: await q.monsterNames(),
  }));

// ---- Owner writes: every handler calls requireOwner() itself ------------

type SaveResult = { ok: true; id: number } | { ok: false; error: string };

export const createHunt = createServerFn({ method: "POST" })
  .validator((d: unknown) => d)
  .handler(async ({ data }): Promise<SaveResult> => {
    await requireOwner();
    const parsed = huntInputSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
    return { ok: true, id: await q.insertHunt(parsed.data) };
  });

export const updateHunt = createServerFn({ method: "POST" })
  .validator((d: { id: number; hunt: unknown }) => ({ id: asId(d?.id), hunt: d?.hunt }))
  .handler(async ({ data }): Promise<SaveResult> => {
    await requireOwner();
    const parsed = huntInputSchema.safeParse(data.hunt);
    if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
    if (!(await q.updateHunt(data.id, parsed.data))) {
      return { ok: false, error: "Esta cacería ya no existe." };
    }
    return { ok: true, id: data.id };
  });

export const deleteHunt = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: asId(d?.id) }))
  .handler(async ({ data }) => {
    await requireOwner();
    await q.deleteHunt(data.id);
  });
