import type { NextRequest } from "next/server";
import { withApiKeyAuth } from "@/lib/api/middleware/apiKeyAuth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { createSSEResponse, setupSSECleanup } from "@/lib/api/sse/utils";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

async function getHandler(
  req: NextRequest,
  {
    params,
    user,
  }: {
    params: Promise<Record<string, string | string[]>>;
    apiKey: string;
    user: {
      userId: string;
      clerkId: string;
      email: string;
      name: string;
    };
  },
) {
  const { requestId } = (await params) as { requestId: string };
  const service = getGenerationV2Service();
  const bundle = await service.repository.getRequestBundle(
    requestId,
    user.clerkId,
  );
  if (!bundle) {
    return new Response("Not found", { status: 404 });
  }

  const { response, send, sendError, close } = createSSEResponse();
  setupSSECleanup(req.signal, close, []);

  void service
    .streamToSse(requestId, req.signal, send)
    .catch(async (error) => {
      logger.error({ error, requestId }, "cli generation SSE stream failed");
      await sendError(
        error instanceof Error ? error : new Error(String(error)),
      ).catch(() => {});
    })
    .finally(() => close().catch(() => {}));

  return response;
}

export const GET = withErrorHandling(withApiKeyAuth(getHandler));
export const dynamic = "force-dynamic";
