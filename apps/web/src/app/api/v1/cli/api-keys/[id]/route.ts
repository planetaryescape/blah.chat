import { type NextRequest, NextResponse } from "next/server";
import { cliApiKeysDAL } from "@/lib/api/dal/cliApiKeys";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function deleteHandler(
  _req: NextRequest,
  {
    userId,
    params,
  }: {
    userId: string;
    params: Promise<Record<string, string | string[]>>;
  },
) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  if (typeof id !== "string") {
    throw new Error("CLI API key id is required");
  }
  logger.info({ userId, keyId: id }, "DELETE /api/v1/cli/api-keys/[id]");
  const result = await cliApiKeysDAL.revoke(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
