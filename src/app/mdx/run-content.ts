import { runSync } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import type { MDXContent } from "mdx/types";

/**
 * Evaluate a stored MDX `function-body` string (produced by the 002 ingest
 * pipeline with `outputFormat: "function-body"`, `development: false`) into a
 * React component, using the production JSX runtime.
 *
 * Synchronous on purpose: routes call this during render on both server and
 * client with identical inputs, so SSR and hydration produce identical markup.
 * The Phase 0 spike confirmed this evaluates cleanly inside the SSR build.
 *
 * `<Clip>` (and any other referenced component) is supplied by the caller via
 * the returned component's `components` prop — the compiled body has no
 * `providerImportSource`, so injection happens through that prop, not context.
 */
export function runMdx(code: string): MDXContent {
  const { default: Content } = runSync(code, {
    ...runtime,
    baseUrl: import.meta.url,
  });
  return Content;
}
