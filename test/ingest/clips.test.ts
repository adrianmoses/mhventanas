import { beforeEach, describe, expect, it } from "vitest";
import { clips, db, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("ingest — clips (body-only)", () => {
  it("harvests <Clip> tags, derives URLs, and keeps clips monster-level", async () => {
    const result = await ingest({ contentRoot: fixture("content") });
    expect(result.clips).toBe(3);

    const rows = await db.select().from(clips);
    expect(rows).toHaveLength(3);

    const general = rows.find((c) => c.slug === "salto-bilis")!;
    // URL derived from CDN_BASE_URL (set in vitest.config) + path convention.
    expect(general.url).toBe("https://cdn.test/wilds/chatacabra/salto-bilis.webm");
    expect(general.caption).toBe("Salto con bilis"); // from the <Clip caption> prop
    expect(general.punishGuideId).toBeNull(); // always null — monster-level asset

    const weaponClip = rows.find((c) => c.slug === "contraataque-cabeza")!;
    expect(weaponClip.url).toBe("https://cdn.test/wilds/chatacabra/contraataque-cabeza.webm");
    expect(weaponClip.caption).toBeNull(); // no caption prop
    expect(weaponClip.punishGuideId).toBeNull();
  });
});
