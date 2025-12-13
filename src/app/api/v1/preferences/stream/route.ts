import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { getConvexClient } from "@/lib/api/convex";
import { api } from "@/convex/_generated/api";
import logger from "@/lib/logger";
import {
  createSSEResponse,
  createHeartbeatLoop,
  createPollingLoop,
  setupSSECleanup,
} from "@/lib/api/sse/utils";

async function getHandler(
  req: NextRequest,
  {
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const startTime = Date.now();

  logger.info(
    { userId },
    "GET /api/v1/preferences/stream - SSE stream started",
  );

  const convex = getConvexClient();

  // Create SSE connection
  const { response, send, sendError, close, isClosed } = createSSEResponse();

  try {
    // Send initial snapshot (all user preferences in single object)
    const initialData = await convex.query(api.users.getAllUserPreferences);

    await send("snapshot", {
      preferences: initialData,
    });

    logger.info({ userId }, "SSE snapshot sent");

    // Poll for updates every 30s (preferences change rarely)
    const pollInterval = createPollingLoop(
      async () => {
        if (isClosed()) return null;

        const preferences = await convex.query(api.users.getAllUserPreferences);

        return { preferences };
      },
      send,
      30_000, // 30s polling (preferences change infrequently)
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
