import { type NextRequest, NextResponse } from "next/server";
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
  const { requestId } = (await params) as { requestId: string };
  const service = getGenerationV2Service();
  const bundle = await service.repository.getRequestBundle(requestId, userId);
  if (!bundle) {
    return new Response("Not found", { status: 404 });
  }

  await service.stop(requestId);
  return NextResponse.json(
    formatEntity(
      {
        requestId,
        status: "cancelling",
      },
      "generationRequest",
      requestId,
    ),
  );
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
