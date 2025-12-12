import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { parseBody, getQueryParam } from "@/lib/api/utils";
import { formatEntity } from "@/lib/utils/formatEntity";
import logger from "@/lib/logger";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().optional(),
  model: z.string(),
  systemPrompt: z.string().optional(),
});

async function postHandler(
  req: NextRequest,
  { userId }: { userId: string },
) {
  const startTime = Date.now();
  logger.info({ userId }, "POST /api/v1/conversations");

  const body = await parseBody(req, createSchema);
  const result = await conversationsDAL.create(userId, body);

  const duration = Date.now() - startTime;
  logger.info(
    { userId, conversationId: result.sys.id, duration },
    "Conversation created",
  );

  return NextResponse.json(result, { status: 201 });
}

async function getHandler(
  req: NextRequest,
  { userId }: { userId: string },
) {
  const startTime = Date.now();
  logger.info({ userId }, "GET /api/v1/conversations");

  const limit = Number.parseInt(getQueryParam(req, "limit") || "50");
  const archived = getQueryParam(req, "archived") === "true";

  const conversations = await conversationsDAL.list(userId, limit, archived);

  const duration = Date.now() - startTime;
  logger.info(
    { userId, count: conversations.length, duration },
    "Conversations retrieved",
  );

  return NextResponse.json(
    formatEntity(
      {
        items: conversations,
        total: conversations.length,
      },
      "list",
    ),
  );
}

export const POST = withErrorHandling(withAuth(postHandler));
export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
