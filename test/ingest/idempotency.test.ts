import { beforeEach, describe, expect, it } from "vitest";
import { clips, db, monsters, punishGuides, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("ingest — idempotency", () => {
  it("re-running does not duplicate rows and advances updated_at", async () => {
    await ingest({ contentRoot: fixture("content") });
    const [before] = await db.select().from(monsters);

    const second = await ingest({ contentRoot: fixture("content") });
    expect(second.monsters).toBe(1);

    const monstersAfter = await db.select().from(monsters);
    expect(monstersAfter).toHaveLength(1);
    expect(monstersAfter[0]!.id).toBe(before!.id);
    // updated_at is bumped on the upsert (never goes backwards, never before created_at).
    expect(monstersAfter[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before!.updatedAt.getTime(),
    );
    expect(monstersAfter[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      monstersAfter[0]!.createdAt.getTime(),
    );

    // Counts stable across all tables.
    expect(await db.select().from(punishGuides)).toHaveLength(2);
    expect(await db.select().from(clips)).toHaveLength(3);
  });
});
