import {
  HUNT_CAUSES,
  HUNT_CAUSE_LABELS,
  HUNT_WEAPON_LABELS,
} from "./labels.js";
import type { HuntCause, HuntRank, HuntResult, HuntWeapon } from "./labels.js";

/**
 * Pure aggregations behind the cuaderno pages (009). Everything is computed in
 * TypeScript over the hunt rows — at personal-log scale this is simpler and
 * easier to test than SQL aggregates. Mirrors the mockup's behaviour.
 */

export interface Hunt {
  id: number;
  huntedOn: string;
  monsterName: string;
  monsterSlug: string;
  rank: HuntRank;
  variant: string | null;
  weapon: HuntWeapon;
  timeSeconds: number | null;
  carts: number;
  result: HuntResult;
  build: string | null;
  hits: string | null;
  causes: HuntCause[];
  cartCause: string | null;
  learned: string | null;
  weaknesses: string | null;
  missingItems: string | null;
  prep: string | null;
  wentWell: string | null;
  mainError: string | null;
  nextGoal: string | null;
}

export interface HuntFilters {
  /** Monster slug. */
  monster?: string;
  weapon?: HuntWeapon;
  q?: string;
}

/** Newest first: by hunt date, then by insertion order (id). */
export function sortNewestFirst(hunts: Hunt[]): Hunt[] {
  return hunts
    .slice()
    .sort((a, b) => b.huntedOn.localeCompare(a.huntedOn) || b.id - a.id);
}

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function searchText(h: Hunt): string {
  return fold(
    [
      h.monsterName,
      h.variant,
      HUNT_WEAPON_LABELS[h.weapon],
      h.build,
      h.hits,
      ...h.causes.map((c) => HUNT_CAUSE_LABELS[c]),
      h.cartCause,
      h.learned,
      h.weaknesses,
      h.missingItems,
      h.prep,
      h.wentWell,
      h.mainError,
      h.nextGoal,
    ]
      .filter(Boolean)
      .join(" \n "),
  );
}

/** Filter by monster slug, weapon, and accent/case-insensitive free text. */
export function filterHunts(hunts: Hunt[], f: HuntFilters): Hunt[] {
  const q = f.q ? fold(f.q.trim()) : "";
  return hunts.filter(
    (h) =>
      (!f.monster || h.monsterSlug === f.monster) &&
      (!f.weapon || h.weapon === f.weapon) &&
      (!q || searchText(h).includes(q)),
  );
}

export interface Summary {
  count: number;
  /** 0-100, null when there are no hunts. */
  completedPct: number | null;
  /** Mean clear time of completed, timed hunts (seconds, rounded). */
  avgTime: number | null;
  avgCarts: number | null;
}

export function summarize(hunts: Hunt[]): Summary {
  const done = hunts.filter((h) => h.result === "ok");
  const times = done
    .map((h) => h.timeSeconds)
    .filter((t): t is number => t != null);
  return {
    count: hunts.length,
    completedPct: hunts.length
      ? Math.round((done.length / hunts.length) * 100)
      : null,
    avgTime: times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null,
    avgCarts: hunts.length
      ? hunts.reduce((s, h) => s + h.carts, 0) / hunts.length
      : null,
  };
}

export interface CauseCount {
  cause: HuntCause;
  count: number;
}

/** "Por qué te golpean": cause frequency, most frequent first. */
export function causeCounts(hunts: Hunt[]): CauseCount[] {
  const counts = new Map<HuntCause, number>();
  for (const h of hunts) {
    for (const c of h.causes) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts]
    .map(([cause, count]) => ({ cause, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        HUNT_CAUSES.indexOf(a.cause) - HUNT_CAUSES.indexOf(b.cause),
    );
}

export interface Goal {
  huntId: number;
  monsterName: string;
  monsterSlug: string;
  nextGoal: string;
  huntedOn: string;
  weapon: HuntWeapon;
}

/** "Objetivos pendientes": the latest next-time goal per monster. */
export function pendingGoals(hunts: Hunt[], limit = 4): Goal[] {
  const seen = new Set<string>();
  const goals: Goal[] = [];
  for (const h of sortNewestFirst(hunts)) {
    if (!h.nextGoal || seen.has(h.monsterSlug)) continue;
    seen.add(h.monsterSlug);
    goals.push({
      huntId: h.id,
      monsterName: h.monsterName,
      monsterSlug: h.monsterSlug,
      nextGoal: h.nextGoal,
      huntedOn: h.huntedOn,
      weapon: h.weapon,
    });
  }
  return goals.slice(0, limit);
}

export interface MonsterRow {
  monsterName: string;
  monsterSlug: string;
  count: number;
  /** Fastest completed, timed hunt. */
  best: number | null;
  /** Most recent completed, timed hunt. */
  last: number | null;
  avgCarts: number;
  /** Most-used weapon (ties → most recently used). */
  weapon: HuntWeapon;
}

/** "Por monstruo" table, most-hunted first. */
export function monsterRows(hunts: Hunt[]): MonsterRow[] {
  const groups = new Map<string, Hunt[]>();
  for (const h of sortNewestFirst(hunts)) {
    const g = groups.get(h.monsterSlug);
    if (g) g.push(h);
    else groups.set(h.monsterSlug, [h]);
  }
  return [...groups.values()]
    .map((hs) => {
      const timed = hs.filter((h) => h.result === "ok" && h.timeSeconds != null);
      const weaponCounts = new Map<HuntWeapon, number>();
      for (const h of hs) {
        weaponCounts.set(h.weapon, (weaponCounts.get(h.weapon) ?? 0) + 1);
      }
      // Map keeps first-seen (= most recent) order; a stable sort keeps it for ties.
      const [weapon] = [...weaponCounts].sort((a, b) => b[1] - a[1])[0]!;
      const newest = hs[0]!;
      return {
        monsterName: newest.monsterName,
        monsterSlug: newest.monsterSlug,
        count: hs.length,
        best: timed.length ? Math.min(...timed.map((h) => h.timeSeconds!)) : null,
        last: timed[0]?.timeSeconds ?? null,
        avgCarts: hs.reduce((s, h) => s + h.carts, 0) / hs.length,
        weapon,
      };
    })
    .sort(
      (a, b) => b.count - a.count || a.monsterName.localeCompare(b.monsterName, "es"),
    );
}

export interface TrendPoint {
  huntId: number;
  huntedOn: string;
  timeSeconds: number;
  carts: number;
}

export interface Trend {
  points: TrendPoint[];
  /** last − first, in seconds; negative = faster than the first hunt. */
  delta: number;
}

/** Clear-time trend for one monster's hunts; null with fewer than 2 points. */
export function timeTrend(hunts: Hunt[]): Trend | null {
  const points = sortNewestFirst(hunts)
    .reverse()
    .filter((h) => h.result === "ok" && h.timeSeconds != null)
    .map((h) => ({
      huntId: h.id,
      huntedOn: h.huntedOn,
      timeSeconds: h.timeSeconds!,
      carts: h.carts,
    }));
  if (points.length < 2) return null;
  return {
    points,
    delta: points[points.length - 1]!.timeSeconds - points[0]!.timeSeconds,
  };
}
