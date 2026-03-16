import {
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildAttachmentObjectKey(input: {
  userId: string;
  conversationId: string;
  messageId?: string;
  fileName: string;
}) {
  const safeName = sanitizeFileName(input.fileName) || "upload.bin";
  const messagePart = input.messageId ? `/messages/${input.messageId}` : "";
  return `users/${input.userId}/conversations/${input.conversationId}${messagePart}/${safeName}`;
}

export async function createSignedUploadUrl(input: {
  client: S3Client;
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    input.client,
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType,
    }),
    { expiresIn: input.expiresIn ?? 60 * 15 },
  );
}

export async function createSignedReadUrl(input: {
  client: S3Client;
  bucket: string;
  key: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    input.client,
    new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
    }),
    { expiresIn: input.expiresIn ?? 60 * 15 },
  );
}
