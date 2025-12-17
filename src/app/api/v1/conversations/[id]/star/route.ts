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
    { userId, conversationId: id },
    "POST /api/v1/conversations/[id]/star",
  );

  const convex = getConvexClient();

  await convex.mutation(api.conversations.toggleStar, {
    conversationId: id as Id<"conversations">,
  });

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/conversations/:id/star",
    method: "POST",
    duration,
    status: 200,
    userId,
  });
  logger.info(
    { userId, conversationId: id, duration },
    "Conversation star toggled",
  );

  return NextResponse.json(
    formatEntity({ conversationId: id }, "conversation"),
    { status: 200 },
  );
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
