import "dotenv/config";
import { runMigrations } from "../src/db/migrate.js";

/**
 * Vitest globalSetup: apply migrations once to the test database before the
 * suite runs. Idempotent — re-running against an already-migrated DB is a no-op.
 */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  }
  await runMigrations(url);
}
