import type { NextRequest } from "next/server";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { createSSEResponse, setupSSECleanup } from "@/lib/api/sse/utils";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";

async function getHandler(
  req: NextRequest,
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

  const { response, send, close } = createSSEResponse();
  setupSSECleanup(req.signal, close, []);

  void service
    .streamToSse(requestId, req.signal, send)
    .finally(() => close().catch(() => {}));

  return response;
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
