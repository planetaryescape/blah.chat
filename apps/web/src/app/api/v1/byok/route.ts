import { type NextRequest, NextResponse } from "next/server";
import { byokDAL } from "@/lib/api/dal/byok";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/byok");
  const config = await byokDAL.get(userId);

  if (!config) {
    return NextResponse.json(formatErrorEntity("BYOK config not found"), {
      status: 404,
    });
  }

  return NextResponse.json(formatEntity(config, "byok", config._id), {
    status: 200,
  });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
