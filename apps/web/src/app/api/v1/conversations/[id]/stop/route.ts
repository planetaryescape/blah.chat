import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import { formatEntity } from "@/lib/utils/formatEntity";

async function postHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id: conversationId } = (await params) as { id: string };
  const service = getGenerationV2Service();
  const activeRequest =
    await service.repository.findLatestActiveRequestForConversation(
      conversationId,
      userId,
    );

  if (!activeRequest) {
    return NextResponse.json(
      formatEntity(
        { stopped: false, conversationId, requestId: null },
        "generation",
        conversationId,
      ),
    );
  }

  await service.stop(activeRequest.id);

  return NextResponse.json(
    formatEntity(
      {
        stopped: true,
        conversationId,
        requestId: activeRequest.id,
      },
      "generation",
      activeRequest.id,
    ),
  );
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
