import { compile } from "@mdx-js/mdx";
import type { Root } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

/** A `<Clip>` reference harvested from an MDX body. */
export interface HarvestedClip {
  slug: string;
  caption?: string;
}

export interface CompileResult {
  /** Function-body string to store in the DB. */
  code: string;
  /** `<Clip>` references harvested from the body (may repeat a slug). */
  clips: HarvestedClip[];
}

const CLIPS_KEY = "harvestedClips";
const ISSUES_KEY = "clipIssues";

function literalAttr(
  node: MdxJsxFlowElement | MdxJsxTextElement,
  name: string,
): string | undefined {
  const attr = node.attributes.find(
    (a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === name,
  );
  return attr && typeof attr.value === "string" ? attr.value : undefined;
}

/**
 * remark plugin: harvest each `<Clip slug="..." caption="...">` during the
 * compile pass. `slug` must be a literal (so its URL/key can be derived); a
 * missing or expression-valued slug is recorded as an issue and the caller
 * fails fast. `caption` is optional; a non-literal caption is ignored.
 */
function collectClips() {
  return (tree: Root, file: { data: Record<string, unknown> }): void => {
    const clips: HarvestedClip[] = [];
    const issues: string[] = [];

    const handle = (node: MdxJsxFlowElement | MdxJsxTextElement): void => {
      if (node.name !== "Clip") return;
      const slug = literalAttr(node, "slug");
      if (slug === undefined) {
        issues.push('a <Clip> is missing a literal "slug" attribute');
        return;
      }
      const caption = literalAttr(node, "caption");
      clips.push(caption === undefined ? { slug } : { slug, caption });
    };

    visit(tree, "mdxJsxFlowElement", handle);
    visit(tree, "mdxJsxTextElement", handle);

    file.data[CLIPS_KEY] = clips;
    file.data[ISSUES_KEY] = issues;
  };
}

/** Compile an MDX body to a function-body string and harvest its `<Clip>` slug references. */
export async function compileBody(
  body: string,
  opts: { baseUrl: string },
): Promise<CompileResult> {
  const vfile = await compile(body, {
    outputFormat: "function-body",
    development: false,
    baseUrl: opts.baseUrl,
    remarkPlugins: [collectClips],
  });

  const data = vfile.data as Record<string, unknown>;
  const issues = (data[ISSUES_KEY] as string[] | undefined) ?? [];
  if (issues.length > 0) {
    throw new Error(issues.join("; "));
  }

  return {
    code: String(vfile),
    clips: (data[CLIPS_KEY] as HarvestedClip[] | undefined) ?? [],
  };
}
