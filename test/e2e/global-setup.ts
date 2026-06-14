import "dotenv/config";

/**
 * Seed the test database with the Chatacabra fixture before the smoke suite.
 * The shared db client reads DATABASE_URL, so point it at TEST_DATABASE_URL
 * before importing any db-touching module.
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  }
  process.env.DATABASE_URL = url;

  const { runMigrations } = await import("../../src/db/migrate.js");
  await runMigrations(url);

  const { sql } = await import("../../src/db/index.js");
  await sql`TRUNCATE monsters, punish_guides, clips RESTART IDENTITY CASCADE`;

  const { ingest } = await import("../../src/ingest/index.js");
  await ingest({ contentRoot: "test/fixtures/content" });

  await sql.end();
}
