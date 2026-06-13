import { compile } from "@mdx-js/mdx";
import type { Root } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

export interface CompileResult {
  /** Function-body string to store in the DB. */
  code: string;
  /** Deduped literal `slug`s referenced by `<Clip>` in the body. */
  referencedSlugs: string[];
}

const SLUGS_KEY = "clipSlugs";
const ISSUES_KEY = "clipIssues";

/**
 * remark plugin: collect `<Clip slug="...">` references during the compile pass.
 * Only literal slugs can be validated against frontmatter, so a missing or
 * expression-valued slug is recorded as an issue (the caller fails fast).
 */
function collectClipSlugs() {
  return (tree: Root, file: { data: Record<string, unknown> }): void => {
    const slugs: string[] = [];
    const issues: string[] = [];

    const handle = (node: MdxJsxFlowElement | MdxJsxTextElement): void => {
      if (node.name !== "Clip") return;
      const slugAttr = node.attributes.find(
        (a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === "slug",
      );
      if (!slugAttr || typeof slugAttr.value !== "string") {
        issues.push('a <Clip> is missing a literal "slug" attribute');
        return;
      }
      slugs.push(slugAttr.value);
    };

    visit(tree, "mdxJsxFlowElement", handle);
    visit(tree, "mdxJsxTextElement", handle);

    file.data[SLUGS_KEY] = [...new Set(slugs)];
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
    remarkPlugins: [collectClipSlugs],
  });

  const data = vfile.data as Record<string, unknown>;
  const issues = (data[ISSUES_KEY] as string[] | undefined) ?? [];
  if (issues.length > 0) {
    throw new Error(issues.join("; "));
  }

  return {
    code: String(vfile),
    referencedSlugs: (data[SLUGS_KEY] as string[] | undefined) ?? [],
  };
}
