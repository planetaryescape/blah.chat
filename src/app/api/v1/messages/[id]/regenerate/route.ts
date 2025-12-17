import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { getConvexClient } from "@/lib/api/convex";
import { api } from "@/convex/_generated/api";
import { formatEntity } from "@/lib/utils/formatEntity";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import type { Id } from "@/convex/_generated/dataModel";
import logger from "@/lib/logger";

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

  const convex = getConvexClient();

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
