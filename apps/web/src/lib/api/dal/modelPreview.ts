import "server-only";
import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { getModel } from "@blah-chat/ai/registry";
import { generateText } from "ai";
import { z } from "zod";
import { formatEntity } from "@/lib/utils/formatEntity";

export const modelPreviewSchema = z.object({
  suggestedModelId: z.string().min(1),
  userMessage: z.string().min(1).max(20_000),
});

export const modelPreviewDAL = {
  /**
   * Replay the last user turn against a different model so the user can
   * compare responses before switching. Stateless — no Postgres write
   * beyond the standard usage record on the LLM call. Cost is gated by
   * Resend-side rate limits in the provider layer.
   */
  async generate(
    clerkUserId: string,
    conversationId: string,
    payload: unknown,
  ) {
    const { suggestedModelId, userMessage } = modelPreviewSchema.parse(payload);

    const result = await generateText({
      model: getModel(suggestedModelId),
      prompt: userMessage,
      providerOptions: getGatewayOptions(suggestedModelId, clerkUserId, [
        "model-preview",
      ]),
    });

    return formatEntity(
      {
        content: result.text,
        modelId: suggestedModelId,
        conversationId,
        usage: result.usage,
      },
      "model_preview",
      conversationId,
    );
  },
};
