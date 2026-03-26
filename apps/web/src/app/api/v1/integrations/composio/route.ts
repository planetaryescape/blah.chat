import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { composioDAL } from "@/lib/api/dal/composio";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

const initiateSchema = z.object({
  integrationId: z.string().trim().min(1),
  redirectUrl: z.string().trim().url(),
});

const revokeSchema = z.object({
  integrationId: z.string().trim().min(1),
});

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/integrations/composio");
  const result = await composioDAL.list(userId);
  return NextResponse.json(result, { status: 200 });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/integrations/composio");
  const body = initiateSchema.parse(await req.json());
  const result = await composioDAL.initiate(userId, body);
  return NextResponse.json(result, { status: 200 });
}

async function deleteHandler(req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "DELETE /api/v1/integrations/composio");
  const body = revokeSchema.parse(await req.json());
  const result = await composioDAL.revoke(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
