import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Raw postgres.js connection. Exported for migrations and explicit teardown.
 *
 * `idle_timeout` closes idle pooled connections after 60s, well before Neon
 * suspends its compute (and drops open connections) after ~5 minutes idle, so
 * the long-lived server never picks up a connection that was cut under it.
 */
export const sql = postgres(url, { idle_timeout: 60 });

/** Shared Drizzle client. Downstream features (002 ingest, 004 loaders) import this. */
export const db = drizzle(sql, { schema });

export { schema };
