import { beforeEach, describe, expect, it } from "vitest";
import { db, monsters, punishGuides, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("ingest — weapon guides", () => {
  it("creates punish_guides with weapon_type, content, and published_at mapped", async () => {
    const result = await ingest({ contentRoot: fixture("content") });
    expect(result.guides).toBe(2);

    const guides = await db.select().from(punishGuides);
    expect(guides).toHaveLength(2);

    const ls = guides.find((g) => g.weaponType === "longsword")!;
    const gs = guides.find((g) => g.weaponType === "greatsword")!;

    expect(ls.publishedAt).toBeInstanceOf(Date); // present in frontmatter
    expect(gs.publishedAt).toBeNull(); // absent ⇒ NULL
    expect(ls.content.length).toBeGreaterThan(0);

    const [monster] = await db.select().from(monsters);
    expect(ls.monsterId).toBe(monster!.id);
    expect(gs.monsterId).toBe(monster!.id);
  });
});
