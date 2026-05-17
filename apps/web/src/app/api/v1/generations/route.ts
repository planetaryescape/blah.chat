import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { applyRateLimit, getLimiter } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/utils";
import { generateConversationAck } from "@/lib/conversations/ackGeneration";
import { getCurrentClerkUserProfile } from "@/lib/generation-v2/clerk";
import {
  getEnqueueGenerationProcessing,
  getGenerationV2Service,
} from "@/lib/generation-v2/runtime";
import type { GenerationV2Service } from "@/lib/generation-v2/service";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

function fireAndForgetAck(
  service: GenerationV2Service,
  userMessage: string,
  requestId: string,
  assistantMessageId: string,
) {
  void generateConversationAck(userMessage)
    .then((ack) => {
      if (!ack) return;
      return service.dispatchAck({
        requestId,
        assistantMessageId,
        modelId: ack.modelId,
        text: ack.text,
      });
    })
    .catch((error) => {
      logger.warn({ error, requestId }, "ack generation failed");
    });
}

const createGenerationSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1),
  clientMessageId: z.string().optional(),
  modelId: z.string().optional(),
  models: z.array(z.string()).optional(),
  parentMessageId: z.string().optional(),
});

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const limiter = getLimiter({
    prefix: "generations",
    limit: 60,
    window: "1 h",
  });
  if (limiter) {
    const limited = await applyRateLimit(limiter, userId);
    if (limited) return limited;
  }

  const body = await parseBody(req, createGenerationSchema);
  const service = getGenerationV2Service();
  const clerkUser = await getCurrentClerkUserProfile();

  if (clerkUser.clerkId !== userId) {
    return NextResponse.json(
      formatEntity({ error: "Access denied" }, "error"),
      {
        status: 403,
      },
    );
  }

  const started = await service.start({
    clerkUser,
    conversationId: body.conversationId,
    content: body.content,
    clientMessageId: body.clientMessageId,
    modelId: body.modelId,
    models: body.models,
    parentMessageId: body.parentMessageId,
  });

  const primaryAssistantMessageId = started.assistantMessageIds[0];
  if (primaryAssistantMessageId) {
    fireAndForgetAck(
      service,
      body.content,
      started.requestId,
      primaryAssistantMessageId,
    );
  }

  try {
    await getEnqueueGenerationProcessing()(started.requestId);
  } catch (error) {
    logger.error(
      { error, requestId: started.requestId },
      "failed to enqueue generation processing",
    );
    throw error;
  }

  return NextResponse.json(
    formatEntity(
      {
        requestId: started.requestId,
        conversationId: started.conversationId,
        userMessageId: started.userMessageId,
        assistantMessageIds: started.assistantMessageIds,
        modelIds: started.modelIds,
        streamUrl: `/api/v1/generations/${started.requestId}/stream`,
        stopUrl: `/api/v1/generations/${started.requestId}/stop`,
        status: "pending",
      },
      "generationRequest",
      started.requestId,
    ),
    { status: 202 },
  );
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
