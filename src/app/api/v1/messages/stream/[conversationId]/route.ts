import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/api/convex";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import {
  createHeartbeatLoop,
  createPollingLoop,
  createSSEResponse,
  setupSSECleanup,
} from "@/lib/api/sse/utils";
import logger from "@/lib/logger";

async function getHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const startTime = Date.now();
  const { conversationId } = (await params) as { conversationId: string };

  logger.info(
    { userId, conversationId },
    "GET /api/v1/messages/stream/[conversationId] - SSE stream started",
  );

  const convex = getConvexClient();

  // Verify user owns the conversation
  // @ts-ignore - Type depth exceeded
  const conversation = await convex.query(api.conversations.get, {
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation || conversation.userId !== userId) {
    return new Response("Not found", { status: 404 });
  }

  // Create SSE connection
  const { response, send, sendError, close, isClosed } = createSSEResponse();

  try {
    // Send initial snapshot (50 messages, paginated)
    // @ts-ignore - Type depth exceeded
    const initialData = await convex.query(api.messages.listPaginated, {
      conversationId: conversationId as Id<"conversations">,
      paginationOpts: {
        numItems: 50,
        cursor: null,
      },
    });

    await send("snapshot", {
      messages: initialData.page,
      hasMore: !initialData.isDone,
      cursor: initialData.continueCursor,
    });

    logger.info(
      { userId, conversationId, messageCount: initialData.page.length },
      "SSE snapshot sent",
    );

    // Poll for updates every 3s
    const pollInterval = createPollingLoop(
      async () => {
        if (isClosed()) return null;

        const messages = await convex.query(api.messages.list, {
          conversationId: conversationId as Id<"conversations">,
        });

        return { messages };
      },
      send,
      3000, // 3s polling for active chat
      "update",
    );

    // Heartbeat every 2min to keep connection alive
    const heartbeat = createHeartbeatLoop(send, 120_000);

    // Setup cleanup on disconnect
    setupSSECleanup(req.signal, close, [pollInterval, heartbeat]);

    const duration = Date.now() - startTime;
    logger.info({ userId, conversationId, duration }, "SSE stream established");

    return response;
  } catch (error) {
    logger.error({ error, userId, conversationId }, "SSE stream error");
    await sendError(error instanceof Error ? error : new Error(String(error)));
    await close();

    return new Response("Internal server error", { status: 500 });
  }
}

export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
