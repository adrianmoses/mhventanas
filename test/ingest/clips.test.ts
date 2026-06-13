import { beforeEach, describe, expect, it } from "vitest";
import { clips, db, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("ingest — clips", () => {
  it("upserts clips from frontmatter, linked to monster and (for weapon files) guide", async () => {
    const result = await ingest({ contentRoot: fixture("content") });
    expect(result.clips).toBe(3);

    const rows = await db.select().from(clips);
    expect(rows).toHaveLength(3);

    const general = rows.find((c) => c.slug === "salto-bilis")!;
    expect(general.punishGuideId).toBeNull(); // declared in index.mdx
    expect(general.url).toContain("salto-bilis");
    expect(general.caption).toBe("Salto con bilis");

    const weaponClip = rows.find((c) => c.slug === "contraataque-cabeza")!;
    expect(weaponClip.punishGuideId).not.toBeNull(); // declared in longsword.mdx
  });
});
