import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { fetchAction } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedConvexClient } from "@/lib/api/convex";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { consumeApiRateLimit } from "@/lib/api/rateLimits";
import { parseRequestJson } from "@/lib/api/utils";
import logger from "@/lib/logger";
import { formatEntityList } from "@/lib/utils/formatEntity";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  conversationId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  dateFrom: z.number().optional(),
  dateTo: z.number().optional(),
  messageType: z.enum(["user", "assistant"]).optional(),
});

async function handler(
  req: NextRequest,
  { userId, sessionToken }: { userId: string; sessionToken: string },
) {
  const startTime = Date.now();
  const body = parseRequestJson(await req.text());
  const validated = searchSchema.parse(body);
  await consumeApiRateLimit(
    getAuthenticatedConvexClient(sessionToken),
    "hybrid-search",
  );

  logger.info({ userId, limit: validated.limit }, "POST /api/v1/search/hybrid");

  // Direct Convex action call - completes in ~200-500ms
  // @ts-ignore - Type depth exceeded with complex Convex action
  const results = await fetchAction(
    api.search.hybridSearch,
    {
      query: validated.query,
      conversationId: validated.conversationId as
        | Id<"conversations">
        | undefined,
      limit: validated.limit,
      dateFrom: validated.dateFrom,
      dateTo: validated.dateTo,
      messageType: validated.messageType,
    },
    { token: sessionToken },
  );

  const duration = Date.now() - startTime;
  logger.info(
    { userId, resultCount: results.length, duration },
    "Search complete",
  );

  return new Response(JSON.stringify(formatEntityList(results, "message")), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
