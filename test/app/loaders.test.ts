import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, punishGuides, sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { loadGeneralData, loadWeaponData } from "../../src/app/loaders/queries.js";
import { fixture } from "../ingest/fixtures.js";

// The Chatacabra fixture ships longsword.mdx (published_at 2026-06-01 → live) and
// greatsword.mdx (no published_at → unpublished), giving the published/unpublished
// matrix the loaders must honor.
beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
  await ingest({ contentRoot: fixture("content") });
});

describe("loadGeneralData", () => {
  it("returns the monster with compiled overview and its clip map", async () => {
    const data = await loadGeneralData({ game: "wilds", monster: "chatacabra" });
    expect(data).not.toBeNull();
    expect(data!.monster.name).toBe("Chatacabra");
    expect(typeof data!.overviewCode).toBe("string");
    expect(data!.overviewCode!.length).toBeGreaterThan(0);
    expect(data!.clipMap["salto-bilis"]).toEqual({
      url: "https://cdn.test/wilds/chatacabra/salto-bilis.webm",
      caption: "Salto con bilis",
    });
  });

  it("lists only published weapon guides (greatsword is unpublished)", async () => {
    const data = await loadGeneralData({ game: "wilds", monster: "chatacabra" });
    expect(data!.weapons).toEqual(["longsword"]);
  });

  it("returns null for an unknown monster slug", async () => {
    expect(await loadGeneralData({ game: "wilds", monster: "nope" })).toBeNull();
  });

  it("returns null for an unknown game", async () => {
    expect(await loadGeneralData({ game: "world", monster: "chatacabra" })).toBeNull();
  });
});

describe("loadWeaponData — publish gating", () => {
  it("returns a published guide with its compiled content", async () => {
    const data = await loadWeaponData({
      game: "wilds",
      monster: "chatacabra",
      weapon: "longsword",
    });
    expect(data).not.toBeNull();
    expect(data!.weapon).toBe("longsword");
    expect(typeof data!.contentCode).toBe("string");
    expect(data!.contentCode.length).toBeGreaterThan(0);
  });

  it("returns null for a guide with no published_at (unpublished)", async () => {
    const data = await loadWeaponData({
      game: "wilds",
      monster: "chatacabra",
      weapon: "greatsword",
    });
    expect(data).toBeNull();
  });

  it("returns null for a guide published in the future", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db
      .update(punishGuides)
      .set({ publishedAt: future })
      .where(eq(punishGuides.weaponType, "longsword"));

    const data = await loadWeaponData({
      game: "wilds",
      monster: "chatacabra",
      weapon: "longsword",
    });
    expect(data).toBeNull();
  });

  it("returns null for an unknown weapon segment", async () => {
    const data = await loadWeaponData({
      game: "wilds",
      monster: "chatacabra",
      weapon: "hammer",
    });
    expect(data).toBeNull();
  });

  it("returns null when the monster does not exist", async () => {
    const data = await loadWeaponData({
      game: "wilds",
      monster: "nope",
      weapon: "longsword",
    });
    expect(data).toBeNull();
  });
});
