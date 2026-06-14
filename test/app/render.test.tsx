import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { sql } from "../../src/db/index.js";
import { ingest } from "../../src/ingest/index.js";
import { loadGeneralData } from "../../src/app/loaders/queries.js";
import { runMdx } from "../../src/app/mdx/run-content.js";
import { mdxComponents } from "../../src/app/mdx/components.js";
import { Clip, ClipMapContext } from "../../src/app/mdx/Clip.js";
import { fixture } from "../ingest/fixtures.js";

beforeEach(async () => {
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;
  await ingest({ contentRoot: fixture("content") });
});

describe("rendering compiled MDX with <Clip>", () => {
  it("renders a stored function-body into HTML with a resolved <video>", async () => {
    const data = await loadGeneralData({ game: "wilds", monster: "chatacabra" });
    const Content = runMdx(data!.overviewCode!);

    const html = renderToStaticMarkup(
      <ClipMapContext.Provider value={data!.clipMap}>
        <Content components={mdxComponents} />
      </ClipMapContext.Provider>,
    );

    expect(html).toContain("Chatacabra");
    expect(html).toContain("Anfibio que cubre sus garras de bilis");
    expect(html).toMatch(/<video/i);
    expect(html).toContain("https://cdn.test/wilds/chatacabra/salto-bilis.webm");
    // Casing varies by renderer; assert presence case-insensitively.
    expect(html).toMatch(/loop/i);
    expect(html).toMatch(/muted/i);
    expect(html).toMatch(/autoplay/i);
    expect(html).toContain("Salto con bilis");
  });
});

describe("<Clip> with an unknown slug", () => {
  it("renders a visible placeholder instead of throwing", () => {
    expect(() =>
      renderToStaticMarkup(
        <ClipMapContext.Provider value={{}}>
          <Clip slug="no-existe" />
        </ClipMapContext.Provider>,
      ),
    ).not.toThrow();

    const html = renderToStaticMarkup(
      <ClipMapContext.Provider value={{}}>
        <Clip slug="no-existe" />
      </ClipMapContext.Provider>,
    );
    expect(html).toContain("Clip no disponible: no-existe");
    expect(html).not.toContain("<video");
  });
});
