import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { getQueryParam, parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

const createSchema = z.object({
  title: z.string().optional(),
  model: z.string(),
  selectedIntegrationIds: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
  projectId: z.string().nullable().optional(),
  isIncognito: z.boolean().optional(),
  incognitoSettings: z
    .object({
      enableReadTools: z.boolean().optional(),
      applyCustomInstructions: z.boolean().optional(),
      inactivityTimeoutMinutes: z.number().optional(),
    })
    .optional(),
});

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = performance.now();
  logger.info({ userId }, "POST /api/v1/conversations");

  const body = await parseBody(req, createSchema);
  const result = await conversationsDAL.create(userId, body);

  const duration = performance.now() - startTime;

  // Track performance metrics
  trackAPIPerformance({
    endpoint: "/api/v1/conversations",
    method: "POST",
    duration,
    status: 201,
    userId,
  });

  return NextResponse.json(result, { status: 201 });
}

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = performance.now();
  logger.info({ userId }, "GET /api/v1/conversations");

  const parsedLimit = Number.parseInt(getQueryParam(req, "limit") || "50", 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, parsedLimit))
    : 50;
  const archived = getQueryParam(req, "archived") === "true";
  const projectId = getQueryParam(req, "projectId");

  const conversations = await conversationsDAL.list(
    userId,
    limit,
    archived,
    undefined,
    projectId,
  );

  const duration = performance.now() - startTime;

  // Track performance metrics
  trackAPIPerformance({
    endpoint: "/api/v1/conversations",
    method: "GET",
    duration,
    status: 200,
    userId,
  });

  // Live data: caching makes new conversations/titles lag in the sidebar.
  return NextResponse.json(
    formatEntity(
      {
        items: conversations,
        total: conversations.length,
      },
      "list",
    ),
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export const POST = withErrorHandling(withAuth(postHandler));
export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
