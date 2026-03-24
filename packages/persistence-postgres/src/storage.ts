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

function buildObjectLeafName(fileName: string) {
  const safeName = sanitizeFileName(fileName) || "upload.bin";
  return `${crypto.randomUUID()}-${safeName}`;
}

export function buildAttachmentObjectKey(input: {
  userId: string;
  conversationId: string;
  messageId?: string;
  fileName: string;
}) {
  const messagePart = input.messageId ? `/messages/${input.messageId}` : "";
  return `users/${input.userId}/conversations/${input.conversationId}${messagePart}/${buildObjectLeafName(input.fileName)}`;
}

export function buildDraftObjectKey(input: {
  userId: string;
  fileName: string;
}) {
  return `users/${input.userId}/drafts/${buildObjectLeafName(input.fileName)}`;
}

export function buildGeneratedAttachmentObjectKey(input: {
  userId: string;
  conversationId: string;
  messageId: string;
  fileName: string;
}) {
  return `users/${input.userId}/conversations/${input.conversationId}/messages/${input.messageId}/generated/${buildObjectLeafName(input.fileName)}`;
}

export function buildCodeExecutionObjectKey(input: {
  userId: string;
  conversationId: string;
  fileName: string;
}) {
  return `users/${input.userId}/conversations/${input.conversationId}/tool-outputs/code-execution/${buildObjectLeafName(input.fileName)}`;
}

export function buildTtsCacheObjectKey(input: {
  hash: string;
  format: string;
}) {
  const safeFormat = sanitizeFileName(input.format) || "bin";
  return `cache/tts/${input.hash}.${safeFormat}`;
}

export async function uploadObject(input: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Uint8Array | ArrayBuffer | Blob | string;
  contentType: string;
  cacheControl?: string;
}) {
  const body =
    input.body instanceof ArrayBuffer ? new Uint8Array(input.body) : input.body;

  await input.client.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl,
    }),
  );
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
