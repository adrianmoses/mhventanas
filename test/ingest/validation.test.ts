import { describe, expect, it } from "vitest";
import { ingest } from "../../src/ingest/index.js";
import { fixture } from "./fixtures.js";

// Each case aborts in phase 1 (before any DB write), so no truncation is needed.
describe("ingest — fail-fast validation", () => {
  it("rejects the same clip slug declared with conflicting captions", async () => {
    await expect(ingest({ contentRoot: fixture("bad/conflicting-caption") })).rejects.toThrow(
      /conflicting captions/,
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
});
