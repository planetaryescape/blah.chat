import type { S3Client } from "@aws-sdk/client-s3";
import { uploadObject } from "@blah-chat/persistence-postgres";

export interface BlobMigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ storageId: string; error: string }>;
}

export interface BlobMigrationOptions {
  concurrency?: number;
  onProgress?: (migrated: number, total: number) => void;
}

/**
 * Migrate a batch of blobs from Convex storage to R2.
 *
 * For each blob entry:
 * 1. Downloads from Convex HTTP API: GET {convexUrl}/api/storage/{storageId}
 * 2. Uploads to R2 via uploadObject
 * 3. Returns the R2 key for updating the record
 */
export async function migrateBlobs(
  entries: Array<{
    storageId: string;
    targetKey: string;
    contentType: string;
  }>,
  opts: {
    convexUrl: string;
    convexAdminToken?: string;
    r2Client: S3Client;
    r2Bucket: string;
  },
  options?: BlobMigrationOptions,
): Promise<BlobMigrationResult> {
  const concurrency = options?.concurrency ?? 10;
  const result: BlobMigrationResult = {
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Process in chunks for concurrency control
  for (let i = 0; i < entries.length; i += concurrency) {
    const chunk = entries.slice(i, i + concurrency);
    const promises = chunk.map(async (entry) => {
      try {
        // Download from Convex
        const url = `${opts.convexUrl}/api/storage/${entry.storageId}`;
        const headers: Record<string, string> = {};
        if (opts.convexAdminToken) {
          headers.Authorization = `Convex ${opts.convexAdminToken}`;
        }
        const response = await fetch(url, { headers });

        if (!response.ok) {
          if (response.status === 404) {
            result.skipped++;
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const body = await response.arrayBuffer();

        // Upload to R2
        await uploadObject({
          client: opts.r2Client,
          bucket: opts.r2Bucket,
          key: entry.targetKey,
          body,
          contentType: entry.contentType,
        });

        result.migrated++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          storageId: entry.storageId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    await Promise.all(promises);
    options?.onProgress?.(
      result.migrated + result.skipped + result.failed,
      entries.length,
    );
  }

  return result;
}
