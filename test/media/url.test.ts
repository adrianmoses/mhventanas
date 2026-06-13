import { afterEach, describe, expect, it, vi } from "vitest";
import { clipKey, clipUrl } from "../../src/media/url.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("clipUrl", () => {
  it("derives the canonical convention URL", () => {
    vi.stubEnv("CDN_BASE_URL", "https://cdn.example");
    expect(clipUrl("wilds", "chatacabra", "salto-bilis")).toBe(
      "https://cdn.example/wilds/chatacabra/salto-bilis.webm",
    );
  });

  it("tolerates a trailing slash on the base", () => {
    vi.stubEnv("CDN_BASE_URL", "https://cdn.example/");
    expect(clipUrl("wilds", "chatacabra", "x")).toBe(
      "https://cdn.example/wilds/chatacabra/x.webm",
    );
  });

  it("throws when CDN_BASE_URL is unset", () => {
    vi.stubEnv("CDN_BASE_URL", "");
    expect(() => clipUrl("wilds", "chatacabra", "x")).toThrow(/CDN_BASE_URL/);
  });
});

describe("clipKey", () => {
  it("mirrors the URL path without the host", () => {
    expect(clipKey("wilds", "chatacabra", "salto-bilis")).toBe(
      "wilds/chatacabra/salto-bilis.webm",
    );
  });
});
