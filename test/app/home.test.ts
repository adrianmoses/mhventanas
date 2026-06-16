import { beforeEach, describe, expect, it } from "vitest";
import { db, monsters, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { loadMonsterIndex } from "../../src/app/loaders/queries.js";
import { fixture } from "../ingest/fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
  await ingest({ contentRoot: fixture("content") });
});

describe("loadMonsterIndex", () => {
  it("lists ingested monsters that have a general guide", async () => {
    const list = await loadMonsterIndex();
    expect(list).toContainEqual(
      expect.objectContaining({ name: "Chatacabra", slug: "chatacabra", game: "wilds" }),
    );
  });

  it("excludes a monster without a general guide (overviewContent NULL)", async () => {
    // Direct insert (not via ingest) — a monster row with no compiled overview
    // would link to an empty page, so it must not appear in the index.
    await db.insert(monsters).values({
      slug: "singuia",
      name: "Sin Guía",
      game: "wilds",
      overviewContent: null,
    });

    const slugs = (await loadMonsterIndex()).map((m) => m.slug);
    expect(slugs).toContain("chatacabra");
    expect(slugs).not.toContain("singuia");
  });

  it("returns an empty array when no monsters qualify", async () => {
    await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
    expect(await loadMonsterIndex()).toEqual([]);
  });
});
