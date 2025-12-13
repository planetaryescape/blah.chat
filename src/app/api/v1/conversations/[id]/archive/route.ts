import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { getConvexClient } from "@/lib/api/convex";
import { api } from "@/convex/_generated/api";
import { formatEntity } from "@/lib/utils/formatEntity";
import type { Id } from "@/convex/_generated/dataModel";
import logger from "@/lib/logger";

async function patchHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const startTime = Date.now();
  const { id } = (await params) as { id: string };
  logger.info(
    { userId, conversationId: id },
    "PATCH /api/v1/conversations/[id]/archive",
  );

  const convex = getConvexClient();

  await convex.mutation(api.conversations.archive, {
    conversationId: id as Id<"conversations">,
  });

  const duration = Date.now() - startTime;
  logger.info(
    { userId, conversationId: id, duration },
    "Conversation archived",
  );

  return NextResponse.json(
    formatEntity({ conversationId: id }, "conversation"),
    { status: 200 },
  );
}

export const PATCH = withErrorHandling(withAuth(patchHandler));
export const dynamic = "force-dynamic";
