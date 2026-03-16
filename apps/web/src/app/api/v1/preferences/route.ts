import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CachePresets, getCacheControl } from "@/lib/api/cache";
import { preferencesDAL } from "@/lib/api/dal/preferences";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { trackAPIPerformance } from "@/lib/api/monitoring";
import { getQueryParam, parseBody } from "@/lib/api/utils";
import logger from "@/lib/logger";

const updateSchema = z.object({
  key: z.string(),
  value: z.any(),
});

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = performance.now();
  logger.info({ userId }, "GET /api/v1/preferences");

  const key = getQueryParam(req, "key");

  // Get single preference or all preferences
  const result = key
    ? await preferencesDAL.get(userId, key)
    : await preferencesDAL.getAll(userId);

  const duration = performance.now() - startTime;
  trackAPIPerformance({
    endpoint: "/api/v1/preferences",
    method: "GET",
    duration,
    status: 200,
    userId,
  });
  logger.info({ userId, key: key || "all", duration }, "Preferences retrieved");

  const cacheControl = getCacheControl(CachePresets.STATIC);
  return NextResponse.json(result, {
    headers: { "Cache-Control": cacheControl },
  });
}

async function patchHandler(req: NextRequest, { userId }: { userId: string }) {
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
