import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { type NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/api/convex";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

async function postHandler(
  _req: NextRequest,
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

  const convex = getConvexClient();

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const newMessageId = await convex.mutation(api.chat.regenerate, {
    messageId: id as Id<"messages">,
  });

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/messages/:id/regenerate",
    method: "POST",
    duration,
    status: 202,
    userId,
  });
  logger.info(
    { userId, messageId: id, newMessageId, duration },
    "Message regenerated",
  );

  return NextResponse.json(
    formatEntity({ messageId: id, newMessageId }, "message"),
    { status: 202 },
  );
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
