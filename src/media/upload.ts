import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { bucket, createS3Client } from "./client.js";

export interface UploadResult {
  uploaded: number;
  keys: string[];
}

async function walkWebm(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return []; // missing media root → nothing to upload
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkWebm(full)));
    } else if (entry.isFile() && entry.name.endsWith(".webm")) {
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Upload every `*.webm` under `mediaRoot` to the bucket at a key mirroring its
 * relative path (`{game}/{monster}/{slug}.webm`), with `Content-Type: video/webm`.
 * Idempotent — re-uploading overwrites the object. Content-agnostic: uploads
 * whatever is present, independent of `content/`.
 */
export async function uploadMedia(
  mediaRoot: string,
  deps: { client?: S3Client; bucketName?: string } = {},
): Promise<UploadResult> {
  const client = deps.client ?? createS3Client();
  const bucketName = deps.bucketName ?? bucket();

  const files = await walkWebm(mediaRoot);
  const keys: string[] = [];
  for (const file of files) {
    const key = path.relative(mediaRoot, file).split(path.sep).join("/");
    const body = await readFile(file);
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: "video/webm",
      }),
    );
    keys.push(key);
  }
  return { uploaded: keys.length, keys };
}

// CLI entry: `pnpm clips:upload` uploads media/ to the configured bucket.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const client = createS3Client();
  try {
    const result = await uploadMedia(path.resolve("media"), { client });
    console.log(`Uploaded ${result.uploaded} clip(s).`);
  } finally {
    client.destroy();
  }
}
