import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";
import { getCurrentClerkUserProfile } from "@/lib/generation-v2/clerk";
import {
  getEnqueueGenerationProcessing,
  getGenerationV2Service,
} from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

const createGenerationSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1),
  clientMessageId: z.string().optional(),
  modelId: z.string().optional(),
  models: z.array(z.string()).optional(),
  parentMessageId: z.string().optional(),
});

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
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
