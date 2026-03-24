import type { PersistenceDb } from "../db";
import type { UsageFeature } from "../schema";
import { usageRecords } from "../schema";

function currentUsageDate() {
  return new Date().toISOString().split("T")[0] ?? new Date().toISOString();
}

export interface RecordImageGenerationUsageInput {
  userId: string;
  conversationId: string;
  model: string;
  cost: number;
  feature?: UsageFeature;
}

export function createUsageRecordRepository(db: PersistenceDb) {
  return {
    async recordImageGeneration(input: RecordImageGenerationUsageInput) {
      await db.insert(usageRecords).values({
        userId: input.userId,
        date: currentUsageDate(),
        model: input.model,
        conversationId: input.conversationId,
        feature: input.feature ?? "chat",
        operationType: "image",
        inputTokens: 0,
        outputTokens: 0,
        cost: input.cost,
        messageCount: 1,
      });
    },
  };
}
