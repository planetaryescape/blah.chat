import { type NextRequest, NextResponse } from "next/server";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { createConversationShare } from "@/lib/persistence/conversationShares";
import { formatEntity } from "@/lib/utils/formatEntity";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  const {
    conversationId,
    title,
    isPublic,
    password,
    anonymizeUsernames,
    expiresAt,
  } = body;

  if (!conversationId || !title) {
    return NextResponse.json(
      {
        status: "error",
        error: { message: "conversationId and title are required" },
      },
      { status: 400 },
    );
  }

  logger.info({ userId, conversationId }, "POST /api/v1/shares");

  const share = await createConversationShare(userId, conversationId, {
    title,
    isPublic,
    password,
    anonymizeUsernames,
    expiresAt,
  });

  return NextResponse.json(formatEntity(share, "share", share.id), {
    status: 201,
  });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
