import { sql as raw } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { clips, db, monsters, punishGuides, sql } from "../src/db/index.js";

/** Postgres SQLSTATE codes asserted on, rather than brittle message text. */
const UNIQUE_VIOLATION = "23505";
const INVALID_TEXT_REPRESENTATION = "22P02";

async function insertMonster(overrides: Partial<typeof monsters.$inferInsert> = {}) {
  const [row] = await db
    .insert(monsters)
    .values({ slug: "chatacabra", name: "Chatacabra", game: "wilds", ...overrides })
    .returning();
  return row!;
}

beforeEach(async () => {
  // Truncating monsters cascades to punish_guides and clips; RESTART IDENTITY
  // keeps id assertions deterministic across tests.
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("monsters", () => {
  it("rejects a duplicate (game, slug)", async () => {
    await insertMonster();
    await expect(insertMonster()).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
  });

  it("allows the same slug in a different game", async () => {
    await insertMonster({ game: "wilds" });
    await expect(insertMonster({ game: "world" })).resolves.toBeDefined();
  });
});

describe("punish_guides", () => {
  it("rejects a second guide for the same (monster, weapon)", async () => {
    const monster = await insertMonster();
    await db
      .insert(punishGuides)
      .values({ monsterId: monster.id, weaponType: "longsword", content: "ls" });
    await expect(
      db
        .insert(punishGuides)
        .values({ monsterId: monster.id, weaponType: "longsword", content: "ls again" }),
    ).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
  });

  it("allows both weapon types for one monster", async () => {
    const monster = await insertMonster();
    await db
      .insert(punishGuides)
      .values({ monsterId: monster.id, weaponType: "longsword", content: "ls" });
    await expect(
      db
        .insert(punishGuides)
        .values({ monsterId: monster.id, weaponType: "greatsword", content: "gs" }),
    ).resolves.toBeDefined();
  });

  it("rejects a weapon_type outside the enum", async () => {
    const monster = await insertMonster();
    // Drizzle's types forbid an invalid value, so go through raw SQL to exercise
    // the DB-level enum constraint.
    await expect(
      db.execute(
        raw`insert into punish_guides (monster_id, weapon_type, content) values (${monster.id}, 'hammer', 'x')`,
      ),
    ).rejects.toMatchObject({ cause: { code: INVALID_TEXT_REPRESENTATION } });
  });
});

describe("clips", () => {
  it("rejects a duplicate (monster, slug)", async () => {
    const monster = await insertMonster();
    await db
      .insert(clips)
      .values({ monsterId: monster.id, slug: "canon-de-rayo", url: "https://cdn/x.webm" });
    await expect(
      db
        .insert(clips)
        .values({ monsterId: monster.id, slug: "canon-de-rayo", url: "https://cdn/y.webm" }),
    ).rejects.toMatchObject({ cause: { code: UNIQUE_VIOLATION } });
  });
});

describe("cascade delete", () => {
  it("removes a monster's punish_guides and clips", async () => {
    const monster = await insertMonster();
    const [guide] = await db
      .insert(punishGuides)
      .values({ monsterId: monster.id, weaponType: "longsword", content: "ls" })
      .returning();
    await db.insert(clips).values({
      monsterId: monster.id,
      punishGuideId: guide!.id,
      slug: "canon-de-rayo",
      url: "https://cdn/x.webm",
    });

    await db.delete(monsters).where(raw`${monsters.id} = ${monster.id}`);

    expect(await db.select().from(punishGuides)).toHaveLength(0);
    expect(await db.select().from(clips)).toHaveLength(0);
  });
});
