import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type {
  PrivateDocumentStorage,
  PrivateObjectGetResult,
  PrivateObjectPutInput,
  PrivateStorageProvider,
} from "./types";

export type S3CompatibleCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region: string;
};

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (
    typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray ===
    "function"
  ) {
    const bytes = await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return Buffer.from(bytes);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Private S3-compatible storage (R2 / Backblaze B2) — no public URLs, server-side only.
 */
export function createS3CompatiblePrivateStorage(
  provider: Exclude<PrivateStorageProvider, "memory" | "unavailable">,
  config: S3CompatibleCredentials
): PrivateDocumentStorage {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  const bucket = config.bucket;

  return {
    provider,
    isConfigured: () => true,
    async put(input: PrivateObjectPutInput) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          // No ACL / no public-read — bucket must remain private.
        })
      );
    },
    async get(key: string): Promise<PrivateObjectGetResult | null> {
      try {
        const out = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
        const body = await streamToBuffer(out.Body);
        return {
          body,
          contentType: out.ContentType || "application/octet-stream",
        };
      } catch (error) {
        const name =
          (error as { name?: string; Code?: string })?.name ??
          (error as { Code?: string })?.Code;
        if (name === "NoSuchKey" || name === "NotFound") return null;
        throw error;
      }
    },
    async delete(key: string) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    },
  };
}
