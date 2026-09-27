import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { asc } from "drizzle-orm";
import { db, hunts, sql } from "./index.js";

/**
 * Backup for the cuaderno (010). `hunts` is the only table that can't be
 * rebuilt from git, so this dumps every row (all columns, timestamps included)
 * as JSON.
 *
 *   pnpm hunts:export                     # → stdout
 *   pnpm hunts:export backups/hunts.json  # → file
 */
export async function exportHunts(): Promise<string> {
  const rows = await db.select().from(hunts).orderBy(asc(hunts.id));
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), count: rows.length, hunts: rows },
    null,
    2,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  try {
    const json = await exportHunts();
    if (out) {
      await writeFile(out, json + "\n");
      console.error(`Exported ${JSON.parse(json).count} hunts to ${out}`);
    } else {
      process.stdout.write(json + "\n");
    }
  } finally {
    await sql.end();
  }
}
