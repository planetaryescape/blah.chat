import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cliApiKeysDAL } from "@/lib/api/dal/cliApiKeys";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/cli/api-keys");
  const result = await cliApiKeysDAL.list(userId);
  return NextResponse.json(result, { status: 200 });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/cli/api-keys");
  const body = createSchema.parse(await req.json());
  const result = await cliApiKeysDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
