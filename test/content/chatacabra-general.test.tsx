import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { loadGeneralData } from "../../src/app/loaders/queries.js";
import { runMdx } from "../../src/app/mdx/run-content.js";
import { mdxComponents } from "../../src/app/mdx/components.js";
import { ClipMapContext } from "../../src/app/mdx/Clip.js";

// 005 authors the real Chatacabra general page under content/ (the source of
// truth), distinct from test/fixtures/. These tests prove it ingests through the
// 002 pipeline and renders through the 004 route machinery. Content facts are
// TODO at this stage; the assertions check structure, not game data.
const CONTENT_ROOT = "content";
const SOURCE_FILE = path.resolve(CONTENT_ROOT, "wilds/chatacabra/index.mdx");

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
});

describe("Chatacabra general content — ingest", () => {
  it("upserts the monster and its placeholder clips, idempotently", async () => {
    await ingest({ contentRoot: CONTENT_ROOT });
    // Re-running must not throw and must not duplicate rows (idempotent upsert).
    await ingest({ contentRoot: CONTENT_ROOT });

    const data = await loadGeneralData({ game: "wilds", monster: "chatacabra" });
    expect(data).not.toBeNull();
    expect(data!.monster.name).toBe("Chatacabra");
    expect(typeof data!.overviewCode).toBe("string");
    expect(data!.overviewCode!.length).toBeGreaterThan(0);

    expect(data!.clipMap["salto-bilis"]).toEqual({
      url: "https://cdn.test/wilds/chatacabra/salto-bilis.webm",
      caption: "Salto con bilis",
    });
    // The placeholder move slugs also harvest into clip rows.
    expect(data!.clipMap["movimiento-clave-2"]).toBeDefined();
    expect(data!.clipMap["movimiento-clave-3"]).toBeDefined();
  });
});

describe("Chatacabra general content — render", () => {
  it("renders the conventional sections in order with a clip", async () => {
    await ingest({ contentRoot: CONTENT_ROOT });
    const data = await loadGeneralData({ game: "wilds", monster: "chatacabra" });
    const Content = runMdx(data!.overviewCode!);

    const html = renderToStaticMarkup(
      <ClipMapContext.Provider value={data!.clipMap}>
        <Content components={mdxComponents} />
      </ClipMapContext.Provider>,
    );

    const lectura = html.indexOf("Lectura del combate");
    const estados = html.indexOf("Estados");
    const movimientos = html.indexOf("Movimientos clave");
    expect(lectura).toBeGreaterThan(-1);
    expect(estados).toBeGreaterThan(lectura);
    expect(movimientos).toBeGreaterThan(estados);

    expect(html).toMatch(/<video/i);
    expect(html).toContain("https://cdn.test/wilds/chatacabra/salto-bilis.webm");
  });
});

describe("Chatacabra general content — structure", () => {
  const raw = readFileSync(SOURCE_FILE, "utf8");

  it("gives every key move the aviso / cómo funciona / qué vigilar anatomy", () => {
    const movesSection = raw.slice(raw.indexOf("## Movimientos clave"));
    // Drop the leading "## Movimientos clave" line, then split into ### moves.
    const moves = movesSection
      .split(/^### /m)
      .slice(1)
      .map((m) => m.trim());

    expect(moves.length).toBeGreaterThanOrEqual(3);
    for (const move of moves) {
      expect(move).toContain("**Aviso:**");
      expect(move).toContain("**Cómo funciona:**");
      expect(move).toContain("**Qué vigilar:**");
      expect(move).toMatch(/<Clip slug="[^"]+"/);
    }
  });

  it("marks unverified facts with a greppable TODO token", () => {
    expect(raw).toContain("TODO");
  });
});
