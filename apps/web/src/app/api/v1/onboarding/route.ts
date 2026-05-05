import { type NextRequest, NextResponse } from "next/server";
import { onboardingDAL } from "@/lib/api/dal/onboarding";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/onboarding");
  const result = await onboardingDAL.get(userId);
  return NextResponse.json(result, { status: 200 });
}

async function patchHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info(
    { userId, fields: Object.keys(body ?? {}) },
    "PATCH /api/v1/onboarding",
  );
  const result = await onboardingDAL.update(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const dynamic = "force-dynamic";
