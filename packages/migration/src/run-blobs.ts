/**
 * Blob migration: Convex storage -> R2
 *
 * Reads the Convex export to find all storageId references,
 * downloads each blob from Convex, uploads to R2,
 * and updates the Postgres records with real R2 keys.
 */

import fs from "node:fs";
import path from "node:path";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as schema from "@blah-chat/persistence-postgres";
import {
  buildTtsCacheObjectKey,
  uploadObject,
} from "@blah-chat/persistence-postgres";
// biome-ignore lint/style/useImportType: need runtime value
import { ConvexHttpClient } from "convex/browser";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readTableFromZip } from "./extract/reader";
import type {
  ConvexAttachment,
  ConvexFeedback,
  ConvexKnowledgeSource,
  ConvexTtsCache,
} from "./types";

// Load .env.local
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

let dir = import.meta.dirname ?? process.cwd();
for (let i = 0; i < 5; i++) {
  const envPath = path.join(dir, ".env.local");
  if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
    break;
  }
  dir = path.dirname(dir);
}

const INPUT_DIR = process.env.INPUT_ZIP ?? "/tmp/convex-export-dir";
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL ?? CONVEX_URL.replace(".cloud", ".site");
const DATABASE_URL = process.env.DATABASE_URL!;
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? process.env.R2_BUCKET ?? "";
const R2_ENDPOINT =
  process.env.R2_ENDPOINT_URL ?? process.env.R2_ENDPOINT ?? "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";

const DRY_RUN = process.argv.includes("--dry-run");

interface BlobEntry {
  type: "attachment" | "tts" | "knowledge" | "feedback";
  storageId: string;
  targetKey: string;
  contentType: string;
  // For updating the PG record after upload
  pgTable: string;
  pgId: string;
  pgKeyField: string;
}

async function main() {
  console.log("=== Blob Migration: Convex Storage -> R2 ===\n");

  // Create R2 client
  const endpoint =
    R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  console.log(`R2 endpoint: ${endpoint}`);
  console.log(`R2 bucket: ${R2_BUCKET}`);
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Convex Site URL: ${CONVEX_SITE_URL}`);
  console.log(DRY_RUN ? "[DRY RUN]\n" : "\n");

  const r2 = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
    forcePathStyle: true,
  });

  // Connect to Postgres
  const connStr = DATABASE_URL.replace(/&channel_binding=[^&]*/g, "");
  const pool = new pg.Pool({ connectionString: connStr });
  const db = drizzle(pool, { schema });

  // Collect all blob entries from the Convex export
  const entries: BlobEntry[] = [];

  // 1. Attachments — upload all blobs regardless of PG state
  const attachments = await readTableFromZip<ConvexAttachment>(
    INPUT_DIR,
    "attachments",
  );
  for (const att of attachments) {
    if (!att.storageId) continue;

    // Deterministic key using Convex IDs for idempotent re-runs
    const targetKey = `users/${att.userId}/conversations/${att.conversationId}/messages/${att.messageId}/${att.storageId}-${att.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Check if a PG record exists to update after upload
    const pgRows = await db
      .select({ id: schema.attachments.id })
      .from(schema.attachments)
      .where(
        eq(schema.attachments.key, `migration/${att.storageId}/${att.name}`),
      )
      .limit(1);

    entries.push({
      type: "attachment",
      storageId: att.storageId,
      targetKey,
      contentType: att.mimeType,
      pgTable: "attachments",
      pgId: pgRows[0]?.id ?? "",
      pgKeyField: "key",
    });
  }
  console.log(
    `Attachments to migrate: ${entries.filter((e) => e.type === "attachment").length}`,
  );

  // 2. TTS Cache
  const ttsEntries = await readTableFromZip<ConvexTtsCache>(
    INPUT_DIR,
    "ttsCache",
  );
  for (const tts of ttsEntries) {
    if (!tts.storageId) continue;
    const targetKey = buildTtsCacheObjectKey({
      hash: tts.hash,
      format: tts.format,
    });
    entries.push({
      type: "tts",
      storageId: tts.storageId,
      targetKey,
      contentType: `audio/${tts.format === "mp3" ? "mpeg" : tts.format}`,
      pgTable: "tts_cache",
      pgId: tts.hash,
      pgKeyField: "key",
    });
  }
  console.log(
    `TTS cache to migrate: ${entries.filter((e) => e.type === "tts").length}`,
  );

  // 3. Knowledge Sources (files with storageId)
  const knowledgeSources = await readTableFromZip<ConvexKnowledgeSource>(
    INPUT_DIR,
    "knowledgeSources",
  );
  for (const ks of knowledgeSources) {
    if (!ks.storageId || ks.type !== "file") continue;
    entries.push({
      type: "knowledge",
      storageId: ks.storageId,
      targetKey: `knowledge/${ks.storageId}/${ks.title}`,
      contentType: ks.mimeType ?? "application/octet-stream",
      pgTable: "knowledge_sources",
      pgId: "", // We'd need the PG ID — skip update for now
      pgKeyField: "storage_key",
    });
  }
  console.log(
    `Knowledge sources to migrate: ${entries.filter((e) => e.type === "knowledge").length}`,
  );

  // 4. Feedback screenshots
  const feedbacks = await readTableFromZip<ConvexFeedback>(
    INPUT_DIR,
    "feedback",
  );
  for (const fb of feedbacks) {
    if (!fb.screenshotStorageId) continue;
    entries.push({
      type: "feedback",
      storageId: fb.screenshotStorageId,
      targetKey: `feedback/${fb.screenshotStorageId}/screenshot`,
      contentType: "image/png",
      pgTable: "feedback_entries",
      pgId: "",
      pgKeyField: "screenshot_key",
    });
  }
  console.log(
    `Feedback screenshots to migrate: ${entries.filter((e) => e.type === "feedback").length}`,
  );

  console.log(`\nTotal blobs: ${entries.length}\n`);

  if (DRY_RUN || entries.length === 0) {
    await pool.end();
    return;
  }

  // Create Convex client for resolving storage URLs
  const convex = new ConvexHttpClient(CONVEX_URL);

  // Download from Convex and upload to R2
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      // Check if already uploaded
      try {
        await r2.send(
          new HeadObjectCommand({ Bucket: R2_BUCKET, Key: entry.targetKey }),
        );
        skipped++;
        continue;
      } catch {
        // Not found — proceed with upload
      }

      // Resolve storage URL via Convex query
      // biome-ignore lint/suspicious/noExplicitAny: convex dynamic query
      const storageUrl = await convex.query("storage:getUrl" as any, {
        storageId: entry.storageId,
      });

      if (!storageUrl) {
        console.log(
          `  [SKIP] ${entry.type}/${entry.storageId} — no URL returned from Convex`,
        );
        skipped++;
        continue;
      }

      const response = await fetch(storageUrl);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(
            `  [SKIP] ${entry.type}/${entry.storageId} — not found in Convex`,
          );
          skipped++;
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const body = await response.arrayBuffer();

      // Upload to R2
      await uploadObject({
        client: r2,
        bucket: R2_BUCKET,
        key: entry.targetKey,
        body,
        contentType: entry.contentType,
      });

      // Update PG record with the real R2 key
      if (entry.pgTable === "attachments" && entry.pgId) {
        await db
          .update(schema.attachments)
          .set({ key: entry.targetKey, bucket: R2_BUCKET })
          .where(eq(schema.attachments.id, entry.pgId));
      } else if (entry.pgTable === "tts_cache") {
        await db
          .update(schema.ttsCache)
          .set({ key: entry.targetKey, bucket: R2_BUCKET })
          .where(eq(schema.ttsCache.hash, entry.pgId));
      }

      migrated++;
      console.log(
        `  [OK] ${entry.type}/${entry.storageId} -> ${entry.targetKey} (${(body.byteLength / 1024).toFixed(1)}KB)`,
      );
    } catch (err) {
      failed++;
      console.log(
        `  [FAIL] ${entry.type}/${entry.storageId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log(`\n=== Blob Migration Complete ===`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Blob migration failed:", err);
  process.exit(1);
});
