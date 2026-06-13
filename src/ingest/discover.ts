import { readdir } from "node:fs/promises";
import path from "node:path";
import type { DiscoveredFile, Weapon } from "./types.js";

const WEAPONS: readonly Weapon[] = ["longsword", "greatsword"];

function isWeapon(value: string): value is Weapon {
  return (WEAPONS as readonly string[]).includes(value);
}

async function walkMdx(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // missing content root → nothing to ingest
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMdx(full)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      out.push(full);
    }
  }
  return out.sort(); // deterministic order
}

/**
 * Walk `contentRoot` and classify each `.mdx` file by the
 * `{game}/{monster}/{index|weapon}.mdx` layout. Fails fast on structural errors:
 * wrong depth, an unknown weapon filename, or a monster with weapon guides but
 * no general (`index.mdx`).
 */
export async function discover(contentRoot: string): Promise<DiscoveredFile[]> {
  const files = await walkMdx(contentRoot);
  const discovered: DiscoveredFile[] = [];

  for (const absPath of files) {
    const segs = path.relative(contentRoot, absPath).split(path.sep);
    if (segs.length !== 3) {
      throw new Error(`${absPath}: expected content/{game}/{monster}/{file}.mdx layout`);
    }
    const [game, monsterSlug, fileName] = segs as [string, string, string];
    const base = path.basename(fileName, ".mdx");

    if (base === "index") {
      discovered.push({ kind: "general", absPath, game, monsterSlug });
    } else if (isWeapon(base)) {
      discovered.push({ kind: "weapon", absPath, game, monsterSlug, weapon: base });
    } else {
      throw new Error(
        `${absPath}: unknown file "${base}.mdx" (expected index.mdx, longsword.mdx, or greatsword.mdx)`,
      );
    }
  }

  // Cross-file invariant: every monster with weapon guides must have a general guide.
  const byMonster = new Map<string, DiscoveredFile[]>();
  for (const d of discovered) {
    const key = `${d.game}/${d.monsterSlug}`;
    const group = byMonster.get(key) ?? [];
    group.push(d);
    byMonster.set(key, group);
  }
  for (const [key, group] of byMonster) {
    if (!group.some((g) => g.kind === "general")) {
      throw new Error(`${key}: has weapon guide(s) but no index.mdx (general guide)`);
    }
  }

  return discovered;
}
