import { type NextRequest, NextResponse } from "next/server";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id: conversationId } = (await params) as { id: string };
  const db = getPersistenceDb();
  const user = await ensureCurrentPersistenceUser(userId);
  const conversation = await db.query.conversations.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, conversationId), eq(table.userId, user.id)),
  });

  if (!conversation) {
    return new Response("Not found", { status: 404 });
  }

  const activeRequest =
    await getGenerationV2Service().repository.findLatestActiveRequestForConversation(
      conversationId,
      userId,
    );

  return NextResponse.json(
    formatEntity(
      {
        conversationId,
        requestId: activeRequest?.id ?? null,
        streamUrl: activeRequest
          ? `/api/v1/generations/${activeRequest.id}/stream`
          : null,
        status: activeRequest?.status ?? null,
      },
      "generation",
      activeRequest?.id ?? conversationId,
    ),
  );
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
