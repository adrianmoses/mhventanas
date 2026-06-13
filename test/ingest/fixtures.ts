import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(here, "../fixtures");

/** Absolute path to a fixture under test/fixtures. */
export function fixture(...segments: string[]): string {
  return path.join(fixturesRoot, ...segments);
}
