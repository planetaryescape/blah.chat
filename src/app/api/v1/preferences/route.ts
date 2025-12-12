import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { preferencesDAL } from "@/lib/api/dal/preferences";
import { parseBody, getQueryParam } from "@/lib/api/utils";
import logger from "@/lib/logger";
import { z } from "zod";

const updateSchema = z.object({
  key: z.string(),
  value: z.any(),
});

async function getHandler(
  req: NextRequest,
  { userId }: { userId: string },
) {
  const startTime = Date.now();
  logger.info({ userId }, "GET /api/v1/preferences");

  const key = getQueryParam(req, "key");

  // Get single preference or all preferences
  const result = key
    ? await preferencesDAL.get(userId, key)
    : await preferencesDAL.getAll(userId);

  const duration = Date.now() - startTime;
  logger.info({ userId, key: key || "all", duration }, "Preferences retrieved");

  return NextResponse.json(result);
}

async function patchHandler(
  req: NextRequest,
  { userId }: { userId: string },
) {
  const startTime = Date.now();
  logger.info({ userId }, "PATCH /api/v1/preferences");

  const body = await parseBody(req, updateSchema);
  const result = await preferencesDAL.update(userId, body);

  const duration = Date.now() - startTime;
  logger.info({ userId, key: body.key, duration }, "Preference updated");

  return NextResponse.json(result);
}

export const GET = withErrorHandling(withAuth(getHandler));
export const PATCH = withErrorHandling(withAuth(patchHandler));
export const dynamic = "force-dynamic";
