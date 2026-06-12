import { after, type NextRequest, NextResponse } from "next/server";
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
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

const createGenerationSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(64_000),
  clientMessageId: z.string().optional(),
  modelId: z.string().optional(),
  models: z.array(z.string()).max(8).optional(),
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

  // Fast ack from a small model while the heavy generation spins up.
  // after() keeps the work alive past the 202 response on serverless.
  const primaryAssistantMessageId = started.assistantMessageIds[0];
  if (primaryAssistantMessageId) {
    after(async () => {
      try {
        const ack = await generateConversationAck(body.content);
        if (!ack) return;
        await service.dispatchAck({
          requestId: started.requestId,
          assistantMessageId: primaryAssistantMessageId,
          modelId: ack.modelId,
          text: ack.text,
        });
      } catch (error) {
        logger.warn(
          { error, requestId: started.requestId },
          "ack generation failed",
        );
      }
    });
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
