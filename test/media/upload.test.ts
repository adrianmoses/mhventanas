import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadMedia } from "../../src/media/upload.js";
import { fixture } from "../ingest/fixtures.js";

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
  s3Mock.on(PutObjectCommand).resolves({});
  // createS3Client() reads these; values are irrelevant since the client is mocked.
  vi.stubEnv("R2_ENDPOINT", "https://acct.r2.cloudflarestorage.com");
  vi.stubEnv("R2_ACCESS_KEY_ID", "test");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "test");
  vi.stubEnv("R2_BUCKET", "mhventanas-clips");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("uploadMedia", () => {
  it("uploads each .webm to a mirrored key with video/webm content type", async () => {
    const result = await uploadMedia(fixture("media"));

    expect(result.uploaded).toBe(3);
    expect(result.keys.sort()).toEqual([
      "wilds/chatacabra/contraataque-cabeza.webm",
      "wilds/chatacabra/offset-tackle.webm",
      "wilds/chatacabra/salto-bilis.webm",
    ]);

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      const input = call.args[0].input;
      expect(input.Bucket).toBe("mhventanas-clips");
      expect(input.ContentType).toBe("video/webm");
      expect(input.Key).toMatch(/^wilds\/chatacabra\/.+\.webm$/);
    }
  });

  it("uploads nothing for a missing media root", async () => {
    const result = await uploadMedia(fixture("media-does-not-exist"));
    expect(result.uploaded).toBe(0);
    expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it("throws when R2 config is missing", async () => {
    vi.stubEnv("R2_ENDPOINT", "");
    await expect(uploadMedia(fixture("media"))).rejects.toThrow(/R2_ENDPOINT/);
  });
});
