import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { messagesDAL } from "@/lib/api/dal/messages";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

const regenerateSchema = z
  .object({
    modelId: z.string().optional(),
  })
  .optional();

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const startTime = performance.now();
  const { id } = (await params) as { id: string };
  logger.info(
    { userId, messageId: id },
    "POST /api/v1/messages/[id]/regenerate",
  );

  const rawBody = await req.text();
  const body = regenerateSchema.parse(
    rawBody.length > 0 ? JSON.parse(rawBody) : undefined,
  );
  const result = await messagesDAL.regenerate(userId, id, body?.modelId);

  const requestId =
    typeof result.data === "object" && result.data && "requestId" in result.data
      ? (result.data.requestId as string | undefined)
      : undefined;

  if (requestId) {
    const service = getGenerationV2Service();
    after(async () => {
      try {
        await service.process(requestId);
      } catch (error) {
        logger.error(
          { error, requestId },
          "regenerate route background generation failed",
        );
      }
    });
  }

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/messages/:id/regenerate",
    method: "POST",
    duration,
    status: 202,
    userId,
  });
  logger.info(
    { userId, messageId: id, requestId, duration },
    "Message regenerated",
  );

  return NextResponse.json(result, { status: 202 });
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
