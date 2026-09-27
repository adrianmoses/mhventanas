import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import * as q from "../../src/app/cuaderno/queries.js";
import { huntInputSchema } from "../../src/app/cuaderno/validate.js";
import { fixture } from "../ingest/fixtures.js";

const values = (patch: Record<string, unknown> = {}) =>
  huntInputSchema.parse({
    huntedOn: "2026-09-20",
    monsterName: "Rey Dau",
    rank: "alto",
    weapon: "longsword",
    time: "18:40",
    carts: "1",
    result: "ok",
    causes: ["pos"],
    nextGoal: "Alejarme en diagonal",
    ...patch,
  });

beforeEach(async () => {
  await sql`TRUNCATE hunts RESTART IDENTITY`;
});

describe("hunt queries", () => {
  it("inserts and reads back a hunt", async () => {
    const id = await q.insertHunt(values());
    const h = await q.getHunt(id);
    expect(h).toMatchObject({
      id,
      huntedOn: "2026-09-20",
      monsterName: "Rey Dau",
      monsterSlug: "rey-dau",
      timeSeconds: 1120,
      carts: 1,
      causes: ["pos"],
      variant: null,
    });
  });

  it("updates a hunt and reports missing ids", async () => {
    const id = await q.insertHunt(values());
    expect(await q.updateHunt(id, values({ time: "15:55", causes: [] }))).toBe(true);
    expect(await q.getHunt(id)).toMatchObject({ timeSeconds: 955, causes: [] });
    expect(await q.updateHunt(id + 100, values())).toBe(false);
  });

  it("deletes a hunt", async () => {
    const id = await q.insertHunt(values());
    expect(await q.deleteHunt(id)).toBe(true);
    expect(await q.getHunt(id)).toBeNull();
    expect(await q.deleteHunt(id)).toBe(false);
  });

  it("lists by monster slug and returns distinct monster names", async () => {
    await q.insertHunt(values());
    await q.insertHunt(values());
    await q.insertHunt(values({ monsterName: "Arkveld" }));
    expect(await q.listHuntsByMonster("rey-dau")).toHaveLength(2);
    expect(await q.listHunts()).toHaveLength(3);
    expect(await q.monsterNames()).toEqual(["Arkveld", "Rey Dau"]);
  });

  it("enforces the carts range in the database too", async () => {
    await expect(q.insertHunt({ ...values(), carts: 4 })).rejects.toThrow();
  });

  it("is untouched by ingest", async () => {
    await q.insertHunt(values());
    await ingest({ contentRoot: fixture("content") });
    expect(await q.listHunts()).toHaveLength(1);
  });
});

describe("exportHunts", () => {
  it("dumps every hunt with all columns", async () => {
    const { exportHunts } = await import("../../src/db/export-hunts.js");
    await q.insertHunt(values());
    await q.insertHunt(values({ monsterName: "Arkveld" }));
    const dump = JSON.parse(await exportHunts());
    expect(dump.count).toBe(2);
    expect(dump.hunts.map((h: { monsterName: string }) => h.monsterName)).toEqual(["Rey Dau", "Arkveld"]);
    expect(dump.hunts[0]).toHaveProperty("createdAt");
    expect(dump.hunts[0]).toHaveProperty("nextGoal", "Alejarme en diagonal");
  });
});
