import "dotenv/config";
import { fileURLToPath } from "node:url";
import { sql } from "../db/index.js";
import { ingest } from "./ingest.js";

// CLI entry: `pnpm ingest` ingests content/ into the DATABASE_URL database.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await ingest();
    console.log(
      `Ingested ${result.monsters} monsters, ${result.guides} guides, ${result.clips} clips.`,
    );
  } finally {
    // The shared postgres.js pool keeps the process alive; close it for the CLI.
    await sql.end();
  }
}

export { ingest } from "./ingest.js";
