import { describe, expect, it } from "vitest";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

// Each case aborts in phase 1 (before any DB write), so no truncation is needed.
describe("ingest — fail-fast validation", () => {
  it("rejects a <Clip> with no matching frontmatter entry", async () => {
    await expect(ingest({ contentRoot: fixture("bad/missing-clip") })).rejects.toThrow(
      /no matching entry/,
    );
  });

  it("rejects an unknown weapon filename", async () => {
    await expect(ingest({ contentRoot: fixture("bad/unknown-weapon") })).rejects.toThrow(
      /unknown file "hammer\.mdx"/,
    );
  });

  it("rejects a weapon file whose monster has no index.mdx", async () => {
    await expect(ingest({ contentRoot: fixture("bad/orphan-weapon") })).rejects.toThrow(
      /no index\.mdx/,
    );
  });

  it("rejects missing required frontmatter (name)", async () => {
    await expect(ingest({ contentRoot: fixture("bad/missing-name") })).rejects.toThrow(
      /invalid frontmatter/,
    );
  });

  it("rejects uncompilable MDX", async () => {
    await expect(ingest({ contentRoot: fixture("bad/bad-mdx") })).rejects.toThrow(
      /failed to compile MDX/,
    );
  });

  it("rejects a clip slug declared in two files under one monster", async () => {
    await expect(ingest({ contentRoot: fixture("bad/dup-clip-slug") })).rejects.toThrow(
      /declared in both/,
    );
  });
});
