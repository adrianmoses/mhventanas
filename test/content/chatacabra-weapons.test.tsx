import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import {
  loadGeneralData,
  loadWeaponData,
} from "../../src/app/loaders/queries.js";
import { runMdx } from "../../src/app/mdx/run-content.js";
import { mdxComponents } from "../../src/app/mdx/components.js";
import { ClipMapContext } from "../../src/app/mdx/Clip.js";

// 006/007 author the Chatacabra weapon punish guides under content/. Like 005
// these prove structure + pipeline wiring, not game data (facts are TODO).
const CONTENT_ROOT = "content";

const WEAPONS = [
  { weapon: "longsword", file: "longsword.mdx" },
  { weapon: "greatsword", file: "greatsword.mdx" },
] as const;

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe.each(WEAPONS)("Chatacabra %s content", ({ weapon, file }) => {
  const sourcePath = path.resolve(CONTENT_ROOT, "wilds/chatacabra", file);

  it("ingests as a live, published punish guide (idempotently)", async () => {
    await ingest({ contentRoot: CONTENT_ROOT });
    await ingest({ contentRoot: CONTENT_ROOT }); // idempotent re-run

    const data = await loadWeaponData({ game: "wilds", monster: "chatacabra", weapon });
    expect(data).not.toBeNull();
    expect(data!.weapon).toBe(weapon);
    expect(typeof data!.contentCode).toBe("string");
    expect(data!.contentCode.length).toBeGreaterThan(0);
    // Monster-level clip is reachable from the weapon page's map.
    expect(data!.clipMap["salto-bilis"]).toBeDefined();
  });

  it("renders the weapon sections in order with a clip", async () => {
    await ingest({ contentRoot: CONTENT_ROOT });
    const data = await loadWeaponData({ game: "wilds", monster: "chatacabra", weapon });
    const Content = runMdx(data!.contentCode);

    const html = renderToStaticMarkup(
      <ClipMapContext.Provider value={data!.clipMap}>
        <Content components={mdxComponents} />
      </ClipMapContext.Provider>,
    );

    const tecnicas = html.indexOf("Técnicas clave");
    const ventanas = html.indexOf("Ventanas de castigo");
    expect(tecnicas).toBeGreaterThan(-1);
    expect(ventanas).toBeGreaterThan(tecnicas);
    expect(html).toMatch(/<video/i);
  });

  it("gives every move the aviso / cómo funciona / qué vigilar / respuesta anatomy", () => {
    const raw = readFileSync(sourcePath, "utf8");
    const movesSection = raw.slice(raw.indexOf("## Ventanas de castigo"));
    const moves = movesSection
      .split(/^### /m)
      .slice(1)
      .map((m) => m.trim());

    expect(moves.length).toBeGreaterThanOrEqual(2);
    for (const move of moves) {
      expect(move).toContain("**Aviso:**");
      expect(move).toContain("**Cómo funciona:**");
      expect(move).toContain("**Qué vigilar:**");
      expect(move).toContain("**Respuesta:**");
      expect(move).toMatch(/<Clip slug="[^"]+"/);
    }
    expect(raw).toContain("TODO");
  });
});

describe("Chatacabra general page — weapon links", () => {
  it("lists both published weapon guides in canonical order", async () => {
    await ingest({ contentRoot: CONTENT_ROOT });
    const data = await loadGeneralData({ game: "wilds", monster: "chatacabra" });
    expect(data!.weapons).toEqual(["longsword", "greatsword"]);
  });
});
