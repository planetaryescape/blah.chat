import "server-only";
import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { SUMMARIZATION_MODEL } from "@blah-chat/ai/operational-models";
import { getModel } from "@blah-chat/ai/registry";
import { calculateCost } from "@blah-chat/ai/utils";
import { usageRecords } from "@blah-chat/persistence-postgres";
import { TEXT_SUMMARIZATION_PROMPT } from "@blah-chat/shared/prompts";
import { generateText } from "ai";
import { z } from "zod";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

const summarizeSchema = z.object({
  text: z.string().min(1).max(64_000),
});

function currentUsageDate() {
  return new Date().toISOString().split("T")[0] ?? new Date().toISOString();
}

export const summarizeDAL = {
  async summarize(clerkUserId: string, payload: unknown) {
    const { text } = summarizeSchema.parse(payload);
    const user = await ensureCurrentPersistenceUser(clerkUserId);

    const result = await generateText({
      model: getModel(SUMMARIZATION_MODEL.id),
      temperature: 0.3,
      system: TEXT_SUMMARIZATION_PROMPT,
      prompt: text,
      providerOptions: getGatewayOptions(SUMMARIZATION_MODEL.id, user.id, [
        "summarize",
      ]),
    });

    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    try {
      await getPersistenceDb()
        .insert(usageRecords)
        .values({
          userId: user.id,
          date: currentUsageDate(),
          model: SUMMARIZATION_MODEL.id,
          conversationId: null,
          feature: "smart_assistant",
          operationType: "text",
          inputTokens,
          outputTokens,
          cost: calculateCost(SUMMARIZATION_MODEL.id, {
            inputTokens,
            outputTokens,
          }),
          messageCount: 1,
        });
    } catch (error) {
      console.warn("summarize usage record failed", error);
    }

    return formatEntity(
      {
        summary: result.text.trim(),
        modelId: SUMMARIZATION_MODEL.id,
        usage: result.usage,
      },
      "summary",
      `summary-${Date.now()}`,
    );
  },
};
