import { beforeEach, describe, expect, it } from "vitest";
import { db, monsters, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("ingest — general guide", () => {
  it("creates a monster row from index.mdx with path-derived slug/game", async () => {
    const result = await ingest({ contentRoot: fixture("content") });
    expect(result.monsters).toBe(1);

    const rows = await db.select().from(monsters);
    expect(rows).toHaveLength(1);
    const m = rows[0]!;
    expect(m.game).toBe("wilds");
    expect(m.slug).toBe("chatacabra");
    expect(m.name).toBe("Chatacabra");
    expect(m.variant).toBeNull();
    expect(typeof m.overviewContent).toBe("string");
    expect(m.overviewContent!.length).toBeGreaterThan(0);
  });
});
