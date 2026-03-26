import "server-only";
import type { NextRequest } from "next/server";
import { cliChatDAL } from "@/lib/api/dal/cliChat";
import type { ApiKeyAuthContext } from "@/lib/api/middleware/apiKeyAuth";
import { withApiKeyAuth } from "@/lib/api/middleware/apiKeyAuth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import {
  createHeartbeatLoop,
  createPollingLoop,
  createSSEResponse,
  setupSSECleanup,
} from "@/lib/api/sse/utils";
import logger from "@/lib/logger";

async function handler(req: NextRequest, context: ApiKeyAuthContext) {
  const { params, user } = context;
  const { conversationId } = (await params) as { conversationId: string };
  const identity = {
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
  };

  const initialMessages = await cliChatDAL.listMessages(
    identity,
    conversationId,
  );

  if (!initialMessages) {
    return new Response("Not found", { status: 404 });
  }

  logger.info(
    { userId: user.userId, conversationId },
    "GET /api/v1/cli/messages/stream/[conversationId]",
  );

  const { response, send, sendError, close, isClosed } = createSSEResponse();
  let lastHash = JSON.stringify(initialMessages);

  try {
    await send("snapshot", {
      messages: initialMessages,
    });

    const pollInterval = createPollingLoop(
      async () => {
        if (isClosed()) return null;

        const messages = await cliChatDAL.listMessages(
          identity,
          conversationId,
        );

        if (!messages) {
          return { messages: [] };
        }

        const nextHash = JSON.stringify(messages);
        if (nextHash === lastHash) {
          return null;
        }

        lastHash = nextHash;
        return { messages };
      },
      send,
      1200,
      "update",
    );

    const heartbeat = createHeartbeatLoop(send, 120_000);
    setupSSECleanup(req.signal, close, [pollInterval, heartbeat]);

    return response;
  } catch (error) {
    await sendError(error instanceof Error ? error : new Error(String(error)));
    await close();
    return new Response("Internal server error", { status: 500 });
  }
}

export const GET = withErrorHandling(withApiKeyAuth(handler)) as any;
export const dynamic = "force-dynamic";
