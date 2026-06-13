import { compile, run } from "@mdx-js/mdx";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { describe, expect, it } from "vitest";

/**
 * De-risks the core 002 contract: an MDX body compiled to a function-body string
 * (what the pipeline stores) can be run server-side later (what 004's loader does)
 * and rendered with a `<Clip>` component injected at render time.
 */
describe("mdx compile -> run -> render round trip", () => {
  const baseUrl = import.meta.url;

  async function compileToCode(body: string): Promise<string> {
    const vfile = await compile(body, {
      outputFormat: "function-body",
      development: false,
      baseUrl,
    });
    return String(vfile);
  }

  it("renders a <Clip> via a provided component map", async () => {
    const code = await compileToCode(
      `# Chatacabra\n\nObserva esto:\n\n<Clip slug="salto-bilis" />\n`,
    );

    const { default: MDXContent } = await run(code, { ...jsxRuntime, baseUrl });

    const Clip = ({ slug }: { slug: string }) =>
      React.createElement("div", { "data-clip": slug });

    const html = renderToStaticMarkup(
      React.createElement(MDXContent, { components: { Clip } }),
    );

    expect(html).toContain("<h1>Chatacabra</h1>");
    expect(html).toContain('data-clip="salto-bilis"');
  });

  it("throws when <Clip> is referenced but no component is provided", async () => {
    const code = await compileToCode(`<Clip slug="x" />`);
    const { default: MDXContent } = await run(code, { ...jsxRuntime, baseUrl });

    expect(() => renderToStaticMarkup(React.createElement(MDXContent))).toThrow();
  });
});
