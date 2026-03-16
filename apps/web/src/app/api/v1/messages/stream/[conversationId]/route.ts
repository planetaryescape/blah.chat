import type { NextRequest } from "next/server";
import { messagesDAL } from "@/lib/api/dal/messages";
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
  const { conversationId } = (await params) as { conversationId: string };
  logger.info(
    { userId, conversationId },
    "GET /api/v1/messages/stream/[conversationId] - SSE stream started",
  );

  const initialMessages = await messagesDAL.list(userId, conversationId);
  if (!initialMessages) {
    return new Response("Not found", { status: 404 });
  }

  const { response, send, sendError, close, isClosed } = createSSEResponse();
  let lastHash = JSON.stringify(initialMessages);

  try {
    await send("snapshot", {
      messages: initialMessages,
      hasMore: false,
      cursor: null,
    });

    const pollInterval = createPollingLoop(
      async () => {
        if (isClosed()) return null;

        const messages = await messagesDAL.list(userId, conversationId);
        const nextHash = JSON.stringify(messages);
        if (nextHash === lastHash) {
          return null;
        }

        lastHash = nextHash;
        return {
          messages,
          hasMore: false,
          cursor: null,
        };
      },
      send,
      250,
      "update",
    );

    const heartbeat = createHeartbeatLoop(send, 120_000);
    setupSSECleanup(req.signal, close, [pollInterval, heartbeat]);

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
