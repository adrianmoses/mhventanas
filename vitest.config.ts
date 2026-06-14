import "dotenv/config";
import { defineConfig } from "vitest/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}

export default defineConfig({
  test: {
    // Playwright owns test/e2e; keep its *.spec.ts out of the Vitest run.
    exclude: ["**/node_modules/**", "**/dist/**", "test/e2e/**"],
    globalSetup: ["./test/setup.ts"],
    // Point the shared db client (which reads DATABASE_URL) at the test database
    // so tests never touch dev data. CDN_BASE_URL lets ingest derive clip URLs
    // deterministically in tests.
    env: { DATABASE_URL: testDatabaseUrl, CDN_BASE_URL: "https://cdn.test" },
    // All test files share one Postgres database and truncate between tests,
    // so run files serially to avoid cross-file races on the shared tables.
    fileParallelism: false,
    pool: "forks",
  },
});
