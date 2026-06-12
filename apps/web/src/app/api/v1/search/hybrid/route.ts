import type { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";
import { searchMessages } from "@/lib/persistence/search";
import { formatEntityList } from "@/lib/utils/formatEntity";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  conversationId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  dateFrom: z.number().optional(),
  dateTo: z.number().optional(),
  messageType: z.enum(["user", "assistant"]).optional(),
});

async function handler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = Date.now();
  const limited = await enforceRateLimit(
    { prefix: "search-hybrid", limit: 60, window: "1 h" },
    userId,
  );
  if (limited) return limited;

  const body = await req.json();
  const validated = searchSchema.parse(body);

  logger.info(
    { userId, query: validated.query, limit: validated.limit },
    "POST /api/v1/search/hybrid",
  );

  const results = await searchMessages(userId, {
    query: validated.query,
    conversationId: validated.conversationId,
    limit: validated.limit,
    dateFrom: validated.dateFrom,
    dateTo: validated.dateTo,
    messageType: validated.messageType,
  });

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
