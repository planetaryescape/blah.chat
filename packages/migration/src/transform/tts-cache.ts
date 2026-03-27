import type { ConvexTtsCache } from "../types";
import { ts } from "./utils";

export interface PgTtsCacheRow {
  hash: string;
  bucket: string;
  key: string;
  text: string;
  voice: string;
  speed: number;
  format: string;
  createdAt: number;
  lastAccessedAt: number;
}

export function transformTtsCache(
  doc: ConvexTtsCache,
  bucket: string,
): PgTtsCacheRow {
  const safeFormat = doc.format.replace(/[^a-zA-Z0-9._-]+/g, "-") || "bin";
  return {
    hash: doc.hash,
    bucket,
    key: `cache/tts/${doc.hash}.${safeFormat}`,
    text: doc.text,
    voice: doc.voice,
    speed: doc.speed,
    format: doc.format,
    createdAt: ts(doc.createdAt),
    lastAccessedAt: ts(doc.lastAccessedAt),
  };
}
