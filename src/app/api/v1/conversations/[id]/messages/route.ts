import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { messagesDAL } from "@/lib/api/dal/messages";
import { parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";
import { z } from "zod";

const sendSchema = z.object({
  content: z.string().min(1),
  modelId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        type: z.enum(["file", "image", "audio"]),
        name: z.string(),
        storageId: z.string(),
        mimeType: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
});

async function handler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id: conversationId } = (await params) as { id: string };
  const startTime = Date.now();
  logger.info(
    { userId, conversationId },
    "POST /api/v1/conversations/:id/messages",
  );

  const body = await parseBody(req, sendSchema);
  const result = await messagesDAL.send(userId, conversationId, body);

  const duration = Date.now() - startTime;
  logger.info(
    {
      userId,
      conversationId,
      assistantMessageId: result.data.assistantMessageId,
      duration,
    },
    "Message sent (async generation started)",
  );

  // 202 Accepted - generation happens async
  return NextResponse.json(result, { status: 202 });
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
