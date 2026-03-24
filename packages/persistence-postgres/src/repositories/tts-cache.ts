import { eq } from "drizzle-orm";
import type { PersistenceDb } from "../db";
import { ttsCache } from "../schema";

export interface UpsertTtsCacheInput {
  hash: string;
  bucket: string;
  key: string;
  text: string;
  voice: string;
  speed: number;
  format: string;
}

export function createTtsCacheRepository(db: PersistenceDb) {
  return {
    async getByHash(hash: string) {
      const row = await db.query.ttsCache.findFirst({
        where: eq(ttsCache.hash, hash),
      });

      if (!row) {
        return undefined;
      }

      const touchedAt = Date.now();
      await db
        .update(ttsCache)
        .set({
          lastAccessedAt: touchedAt,
        })
        .where(eq(ttsCache.hash, hash));

      return (
        (await db.query.ttsCache.findFirst({
          where: eq(ttsCache.hash, hash),
        })) ?? row
      );
    },

    async upsert(input: UpsertTtsCacheInput) {
      const timestamp = Date.now();

      await db
        .insert(ttsCache)
        .values({
          hash: input.hash,
          bucket: input.bucket,
          key: input.key,
          text: input.text,
          voice: input.voice,
          speed: input.speed,
          format: input.format,
          createdAt: timestamp,
          lastAccessedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: ttsCache.hash,
          set: {
            bucket: input.bucket,
            key: input.key,
            text: input.text,
            voice: input.voice,
            speed: input.speed,
            format: input.format,
            lastAccessedAt: timestamp,
          },
        });

      const row = await db.query.ttsCache.findFirst({
        where: eq(ttsCache.hash, input.hash),
      });

      if (!row) {
        throw new Error(`Failed to persist TTS cache for hash=${input.hash}`);
      }

      return row;
    },
  };
}
