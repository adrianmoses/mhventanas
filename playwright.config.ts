import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const TEST_DB = process.env.TEST_DATABASE_URL;
if (!TEST_DB) {
  throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
}

const PORT = 4799;

// Fixed cuaderno (010) secrets for the E2E server; the specs log in with
// E2E_OWNER_SECRET. Never used outside tests.
export const E2E_OWNER_SECRET = "e2e-owner-secret";
const E2E_SESSION_SECRET = "e2e-session-secret-at-least-32-characters";

// Smoke E2E for the guide routes. Builds the app and serves the real production
// artifact (the Nitro Node server, `node .output/server/index.mjs`) so SSR + clean
// hydration are exercised exactly as a deployed instance would. The server reads
// DATABASE_URL and PORT; point DATABASE_URL at the seeded test database.
export default defineConfig({
  testDir: "./test/e2e",
  globalSetup: "./test/e2e/global-setup.ts",
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && node .output/server/index.mjs`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DB,
      PORT: String(PORT),
      CUADERNO_OWNER_SECRET: E2E_OWNER_SECRET,
      SESSION_SECRET: E2E_SESSION_SECRET,
    },
  },
});
