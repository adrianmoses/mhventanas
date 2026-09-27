import { describe, expect, it } from "vitest";
import {
  causeCounts,
  filterHunts,
  monsterRows,
  pendingGoals,
  sortNewestFirst,
  summarize,
  timeTrend,
} from "../../src/app/cuaderno/stats.js";
import { SAMPLES, hunt } from "./fixtures.js";

describe("sortNewestFirst", () => {
  it("orders by date desc, then id desc for same-day hunts", () => {
    const hs = [hunt({ id: 1, huntedOn: "2026-01-01" }), hunt({ id: 2, huntedOn: "2026-01-02" }), hunt({ id: 3, huntedOn: "2026-01-02" })];
    expect(sortNewestFirst(hs).map((h) => h.id)).toEqual([3, 2, 1]);
  });
});

describe("filterHunts", () => {
  it("filters by monster slug and weapon", () => {
    expect(filterHunts(SAMPLES, { monster: "nargacuga" }).map((h) => h.id)).toEqual([3]);
    expect(filterHunts(SAMPLES, { weapon: "greatsword" })).toEqual([]);
  });

  it("searches text fields case- and accent-insensitively", () => {
    expect(filterHunts(SAMPLES, { q: "ANTIDOTOS" }).map((h) => h.id)).toEqual([1]);
    expect(filterHunts(SAMPLES, { q: "trampa" }).map((h) => h.id)).toEqual([2]);
  });

  it("searches cause and weapon labels", () => {
    expect(filterHunts(SAMPLES, { q: "sin aguante" }).map((h) => h.id)).toEqual([3]);
    expect(filterHunts(SAMPLES, { q: "espada larga" })).toHaveLength(3);
  });
});

describe("summarize", () => {
  it("computes the mockup's four stats", () => {
    const s = summarize(SAMPLES);
    expect(s.count).toBe(3);
    expect(s.completedPct).toBe(100);
    expect(s.avgTime).toBe(Math.round((1120 + 955 + 1380) / 3));
    expect(s.avgCarts).toBe(1);
  });

  it("averages time over completed, timed hunts only", () => {
    const s = summarize([
      hunt({ id: 1, timeSeconds: 600 }),
      hunt({ id: 2, timeSeconds: 1200, result: "fail" }),
      hunt({ id: 3, timeSeconds: null }),
      hunt({ id: 4, result: "quit" }),
    ]);
    expect(s.avgTime).toBe(600);
    expect(s.completedPct).toBe(50);
  });

  it("returns empty values for no hunts", () => {
    expect(summarize([])).toEqual({ count: 0, completedPct: null, avgTime: null, avgCarts: null });
  });
});

describe("causeCounts", () => {
  it("counts causes, most frequent first, ties in canonical order", () => {
    expect(causeCounts(SAMPLES)).toEqual([
      { cause: "tell", count: 2 },
      { cause: "greed", count: 2 },
      { cause: "pos", count: 1 },
      { cause: "stamina", count: 1 },
    ]);
  });
});

describe("pendingGoals", () => {
  it("keeps the latest goal per monster", () => {
    expect(pendingGoals(SAMPLES).map((g) => [g.monsterSlug, g.nextGoal])).toEqual([
      ["nargacuga", "Esquivar hacia un lado del coletazo vertical"],
      ["rathalos", "Parar tras el primer castigo al coletazo"],
    ]);
  });

  it("skips hunts without a goal and caps at the limit", () => {
    const hs = Array.from({ length: 6 }, (_, i) =>
      hunt({ id: i + 1, monsterName: `M${i}`, monsterSlug: `m${i}`, nextGoal: `goal ${i}` }),
    );
    hs.push(hunt({ id: 99, monsterSlug: "m0", huntedOn: "2027-01-01" })); // newer, no goal
    const goals = pendingGoals(hs);
    expect(goals).toHaveLength(4);
    expect(goals.find((g) => g.monsterSlug === "m0")).toBeUndefined(); // m0 is 6th by id
    expect(pendingGoals(hs, 10).find((g) => g.monsterSlug === "m0")?.nextGoal).toBe("goal 0");
  });
});

describe("monsterRows", () => {
  it("builds the per-monster table, most-hunted first", () => {
    expect(monsterRows(SAMPLES)).toEqual([
      { monsterName: "Rathalos", monsterSlug: "rathalos", count: 2, best: 955, last: 955, avgCarts: 0.5, weapon: "longsword" },
      { monsterName: "Nargacuga", monsterSlug: "nargacuga", count: 1, best: 1380, last: 1380, avgCarts: 2, weapon: "longsword" },
    ]);
  });

  it("uses the most recent completed time for 'last' and ignores failed hunts", () => {
    const [row] = monsterRows([
      hunt({ id: 1, huntedOn: "2026-01-01", timeSeconds: 900 }),
      hunt({ id: 2, huntedOn: "2026-01-02", timeSeconds: 1000 }),
      hunt({ id: 3, huntedOn: "2026-01-03", timeSeconds: 500, result: "fail" }),
    ]);
    expect(row).toMatchObject({ best: 900, last: 1000 });
  });

  it("picks the most-used weapon, breaking ties by most recent", () => {
    const [row] = monsterRows([
      hunt({ id: 1, huntedOn: "2026-01-01", weapon: "greatsword" }),
      hunt({ id: 2, huntedOn: "2026-01-02", weapon: "bow" }),
    ]);
    expect(row!.weapon).toBe("bow");
  });

  it("shows the most recent spelling of the monster name", () => {
    const [row] = monsterRows([
      hunt({ id: 1, huntedOn: "2026-01-01", monsterName: "rathalos" }),
      hunt({ id: 2, huntedOn: "2026-01-02", monsterName: "Rathalos" }),
    ]);
    expect(row!.monsterName).toBe("Rathalos");
  });
});

describe("timeTrend", () => {
  it("returns oldest→newest completed times and a negative delta when faster", () => {
    const t = timeTrend(SAMPLES.filter((h) => h.monsterSlug === "rathalos"));
    expect(t!.points.map((p) => p.timeSeconds)).toEqual([1120, 955]);
    expect(t!.delta).toBe(955 - 1120);
  });

  it("needs at least two completed, timed hunts", () => {
    expect(timeTrend([hunt({ id: 1, timeSeconds: 900 })])).toBeNull();
    expect(
      timeTrend([hunt({ id: 1, timeSeconds: 900 }), hunt({ id: 2, timeSeconds: 800, result: "fail" })]),
    ).toBeNull();
  });
});
