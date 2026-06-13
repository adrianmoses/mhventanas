import path from "node:path";
import { pathToFileURL } from "node:url";
import { compileBody } from "./compile.js";
import { discover } from "./discover.js";
import { parseFile } from "./parse.js";
import type { CompiledFile, CompiledGeneral, CompiledWeapon, MonsterRecord } from "./types.js";
import { upsertMonster } from "./upsert.js";
import { validateClipReferences, validateNoDuplicateClipSlugs } from "./validate.js";

export interface IngestResult {
  monsters: number;
  guides: number;
  clips: number;
}

/**
 * Ingest all MDX under `contentRoot` (default `content/`) into the database.
 * Two-phase: parse + compile + validate every file in memory first, so any bad
 * input aborts the run before a single row is written; then upsert per monster.
 */
export async function ingest(opts: { contentRoot?: string } = {}): Promise<IngestResult> {
  const contentRoot = opts.contentRoot ?? path.resolve("content");
  const discovered = await discover(contentRoot);

  // Phase 1 — parse, compile, validate (no DB writes).
  const compiled: CompiledFile[] = [];
  for (const file of discovered) {
    const parsed = await parseFile(file);
    let result;
    try {
      result = await compileBody(parsed.body, { baseUrl: pathToFileURL(file.absPath).href });
    } catch (e) {
      throw new Error(`${file.absPath}: failed to compile MDX — ${(e as Error).message}`);
    }
    const cf = { ...parsed, code: result.code, referencedSlugs: result.referencedSlugs } as CompiledFile;
    validateClipReferences(cf);
    compiled.push(cf);
  }

  // Group by monster.
  const groups = new Map<string, CompiledFile[]>();
  for (const cf of compiled) {
    const key = `${cf.game}/${cf.monsterSlug}`;
    const group = groups.get(key) ?? [];
    group.push(cf);
    groups.set(key, group);
  }

  const records: MonsterRecord[] = [];
  for (const files of groups.values()) {
    const general = files.find((f): f is CompiledGeneral => f.kind === "general");
    if (!general) continue; // discover() guarantees this, but keep the type narrowed
    validateNoDuplicateClipSlugs(general.game, general.monsterSlug, files);
    const weapons = files.filter((f): f is CompiledWeapon => f.kind === "weapon");
    records.push({ game: general.game, monsterSlug: general.monsterSlug, general, weapons });
  }

  // Phase 2 — write.
  let guides = 0;
  let clipCount = 0;
  for (const rec of records) {
    const counts = await upsertMonster(rec);
    guides += counts.guides;
    clipCount += counts.clips;
  }

  return { monsters: records.length, guides, clips: clipCount };
}
