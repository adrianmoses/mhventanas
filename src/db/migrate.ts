import "dotenv/config";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const MIGRATIONS_FOLDER = "./drizzle";

/**
 * Apply all pending migrations against the given connection string, then close
 * the connection. Uses a single connection (migrator best practice). Importable
 * so the test setup can migrate the test database without shelling out.
 */
export async function runMigrations(url: string): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await sql.end();
  }
}

// CLI entry: `tsx src/db/migrate.ts` migrates the DATABASE_URL database.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  await runMigrations(url);
  console.log("Migrations applied.");
}
