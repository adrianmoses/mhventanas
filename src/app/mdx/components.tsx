import type { MDXComponents } from "mdx/types";
import { Clip } from "./Clip.js";

/**
 * The shared MDX components map injected into every rendered guide body via the
 * content component's `components` prop. Currently just `<Clip>`; richer guide
 * components (move cards, the punish-window timeline bar) arrive with the
 * content features (005-007).
 */
export const mdxComponents: MDXComponents = {
  Clip,
};
