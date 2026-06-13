import { S3Client } from "@aws-sdk/client-s3";

/**
 * Build an S3-compatible client for Cloudflare R2 from env. Using the S3 API
 * keeps this portable to any S3-compatible endpoint. Throws if config is missing.
 */
export function createS3Client(): S3Client {
  const endpoint = requireEnv("R2_ENDPOINT");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: "auto", // R2 requires "auto"
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // R2 expects path-style addressing
  });
}

/** The configured bucket name. */
export function bucket(): string {
  return requireEnv("R2_BUCKET");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set (see .env.example)`);
  }
  return value;
}
