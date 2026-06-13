import { beforeEach, describe, expect, it } from "vitest";
import { db, monsters, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("ingest — edit in place", () => {
  it("updates the existing monster row when its content changes", async () => {
    await ingest({ contentRoot: fixture("edit/before") });
    const [before] = await db.select().from(monsters);
    const originalId = before!.id;
    const originalContent = before!.overviewContent;
    expect(before!.name).toBe("Chatacabra");

    await ingest({ contentRoot: fixture("edit/after") });
    const after = await db.select().from(monsters);

    expect(after).toHaveLength(1); // no new row
    expect(after[0]!.id).toBe(originalId); // same row updated
    expect(after[0]!.name).toBe("Chatacabra Editado");
    expect(after[0]!.overviewContent).not.toBe(originalContent);
  });
});
