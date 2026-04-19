import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client as MinioClient } from "minio";
import { env } from "@/config";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type GlobalMinio = typeof globalThis & {
  __minioClient__?: MinioClient;
  __minioBucketPromise__?: Promise<void>;
};

function getMinioEndpointParts(): {
  host: string;
  port: number;
  protocol: "http" | "https";
  useSSL: boolean;
} {
  const normalizedEndpoint = env.MINIO_ENDPOINT.trim();

  if (normalizedEndpoint.startsWith("http://") || normalizedEndpoint.startsWith("https://")) {
    const url = new URL(normalizedEndpoint);

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : env.MINIO_PORT,
      protocol: url.protocol === "https:" ? "https" : "http",
      useSSL: url.protocol === "https:",
    };
  }

  return {
    host: normalizedEndpoint,
    port: env.MINIO_PORT,
    protocol: env.NODE_ENV === "production" ? "https" : "http",
    useSSL: env.NODE_ENV === "production",
  };
}

function createMinioClient(): MinioClient {
  const endpoint = getMinioEndpointParts();

  return new MinioClient({
    endPoint: endpoint.host,
    port: endpoint.port,
    useSSL: endpoint.useSSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
}

function getPublicObjectUrl(filename: string): string {
  const endpoint = getMinioEndpointParts();
  const needsPort =
    (endpoint.protocol === "https" && endpoint.port !== 443) ||
    (endpoint.protocol === "http" && endpoint.port !== 80);
  const host = needsPort ? `${endpoint.host}:${endpoint.port}` : endpoint.host;

  return `${endpoint.protocol}://${host}/${env.MINIO_BUCKET}/${filename}`;
}

function assertUploadConstraints(buffer: Buffer, mimetype: string): void {
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size must not exceed 5MB");
  }

  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed");
  }
}

const globalForMinio = globalThis as GlobalMinio;

const minioClient = globalForMinio.__minioClient__ ?? createMinioClient();

if (env.NODE_ENV !== "production") {
  globalForMinio.__minioClient__ = minioClient;
}

export async function ensureBucket(): Promise<void> {
  if (!globalForMinio.__minioBucketPromise__) {
    globalForMinio.__minioBucketPromise__ = (async () => {
      const bucketExists = await minioClient.bucketExists(env.MINIO_BUCKET);

      if (!bucketExists) {
        await minioClient.makeBucket(env.MINIO_BUCKET);
      }

      await minioClient.setBucketPolicy(
        env.MINIO_BUCKET,
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                AWS: ["*"],
              },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${env.MINIO_BUCKET}/*`],
            },
          ],
        }),
      );
    })().catch((error) => {
      globalForMinio.__minioBucketPromise__ = undefined;
      throw error;
    });
  }

  await globalForMinio.__minioBucketPromise__;
}

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  assertUploadConstraints(buffer, mimetype);
  await ensureBucket();

  const safeName = path.basename(filename).replace(/\s+/g, "-");
  const objectName = `${randomUUID()}-${safeName}`;

  await minioClient.putObject(env.MINIO_BUCKET, objectName, buffer, buffer.byteLength, {
    "Content-Type": mimetype,
  });

  return getPublicObjectUrl(objectName);
}

export async function deleteFile(filename: string): Promise<void> {
  await ensureBucket();
  await minioClient.removeObject(env.MINIO_BUCKET, filename);
}
