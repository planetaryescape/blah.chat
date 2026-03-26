import { type NextRequest, NextResponse } from "next/server";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import {
  extendConversationShareExpiration,
  toggleConversationShare,
} from "@/lib/persistence/conversationShares";
import { formatEntity } from "@/lib/utils/formatEntity";

async function patchHandler(
  req: NextRequest,
  {
    userId,
    params,
  }: { userId: string; params: Promise<Record<string, string | string[]>> },
) {
  const { id } = await params;
  const shareId = String(id);
  const body = await req.json();

  logger.info({ userId, shareId }, "PATCH /api/v1/shares/[id]");

  if ("isActive" in body) {
    const share = await toggleConversationShare(userId, shareId, body.isActive);
    if (!share) {
      return NextResponse.json(
        { status: "error", error: { message: "Share not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json(formatEntity(share, "share", share.id));
  }

  if ("expiresAt" in body) {
    const share = await extendConversationShareExpiration(
      userId,
      shareId,
      body.expiresAt,
    );
    if (!share) {
      return NextResponse.json(
        { status: "error", error: { message: "Share not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json(formatEntity(share, "share", share.id));
  }

  return NextResponse.json(
    { status: "error", error: { message: "No valid update fields provided" } },
    { status: 400 },
  );
}

export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const dynamic = "force-dynamic";
