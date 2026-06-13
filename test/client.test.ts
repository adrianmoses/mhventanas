import { sql as raw } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";

describe("db client", () => {
  it("connects and runs a trivial query", async () => {
    const result = await db.execute<{ ok: number }>(raw`select 1 as ok`);
    expect(result[0]?.ok).toBe(1);
  });
});
