import { type NextRequest, NextResponse } from "next/server";
import { memoriesDAL } from "@/lib/api/dal/memories";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function deleteHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  logger.info({ userId, memoryId: id }, "DELETE /api/v1/memories/:id");

  const result = await memoriesDAL.delete(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
