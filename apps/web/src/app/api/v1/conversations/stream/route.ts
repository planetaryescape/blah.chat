import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { NextRequest } from "next/server";
import { getAuthenticatedConvexClient } from "@/lib/api/convex";
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
    userId,
    sessionToken,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
    sessionToken: string;
  },
) {
  const startTime = Date.now();
  const { searchParams } = new URL(req.url);

  // Parse query parameters
  const searchQuery = searchParams.get("search") || undefined;
  const limit = searchParams.get("limit")
    ? Number.parseInt(searchParams.get("limit")!, 10)
    : undefined;
  const projectId = searchParams.get("projectId") || undefined;

  logger.info(
    { userId, searchQuery, limit, projectId },
    "GET /api/v1/conversations/stream - SSE stream started",
  );

  const convex = getAuthenticatedConvexClient(sessionToken);

  // Create SSE connection
  const { response, send, sendError, close, isClosed } = createSSEResponse();

  try {
    // Send initial snapshot
    const initialData = (await (convex.query as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.conversations.list,
      {
        searchQuery,
        limit,
        projectId:
          projectId === "none"
            ? ("none" as const)
            : projectId
              ? (projectId as Id<"projects">)
              : undefined,
      },
    )) as any[];

    await send("snapshot", {
      conversations: initialData,
    });

    logger.info(
      { userId, conversationCount: initialData.length },
      "SSE snapshot sent",
    );

    // Poll for updates every 5s
    const pollInterval = createPollingLoop(
      async () => {
        if (isClosed()) return null;

        const conversations = (await (convex.query as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          api.conversations.list,
          {
            searchQuery,
            limit,
            projectId:
              projectId === "none"
                ? ("none" as const)
                : projectId
                  ? (projectId as Id<"projects">)
                  : undefined,
          },
        )) as any[];

        return { conversations };
      },
      send,
      5000, // 5s polling for conversation list
      "update",
    );

    // Heartbeat every 2min to keep connection alive
    const heartbeat = createHeartbeatLoop(send, 120_000);

    // Setup cleanup on disconnect
    setupSSECleanup(req.signal, close, [pollInterval, heartbeat]);

    const duration = Date.now() - startTime;
    logger.info({ userId, duration }, "SSE stream established");

    return response;
  } catch (error) {
    logger.error({ error, userId }, "SSE stream error");
    await sendError(error instanceof Error ? error : new Error(String(error)));
    await close();

    return new Response("Internal server error", { status: 500 });
  }
}

export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
