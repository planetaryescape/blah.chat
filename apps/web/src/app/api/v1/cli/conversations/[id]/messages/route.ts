import { type NextRequest, NextResponse } from "next/server";
import { cliChatDAL, cliSendMessageSchema } from "@/lib/api/dal/cliChat";
import { withApiKeyAuth } from "@/lib/api/middleware/apiKeyAuth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { parseBody } from "@/lib/api/utils";
import { getEnqueueGenerationProcessing } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";

async function getHandler(
  _req: NextRequest,
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
  const { id: conversationId } = (await params) as { id: string };
  const result = await cliChatDAL.listMessages(user, conversationId);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.json(result);
}

async function postHandler(
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
  // Shares the per-user send bucket with the web send path.
  const limited = await enforceRateLimit(
    { prefix: "messages", limit: 60, window: "1 h" },
    user.clerkId,
  );
  if (limited) return limited;

  const { id: conversationId } = (await params) as { id: string };
  const body = await parseBody(req, cliSendMessageSchema);
  const result = await cliChatDAL.sendMessage(user, conversationId, body);
  const requestId =
    typeof result.data === "object" &&
    result.data &&
    "requestId" in result.data &&
    typeof result.data.requestId === "string"
      ? result.data.requestId
      : null;

  if (requestId) {
    try {
      await getEnqueueGenerationProcessing()(requestId);
    } catch (error) {
      logger.error(
        { error, requestId },
        "failed to enqueue cli chat generation processing",
      );
      throw error;
    }
  }

  return NextResponse.json(result, { status: 202 });
}

export const GET = withErrorHandling(withApiKeyAuth(getHandler));
export const POST = withErrorHandling(withApiKeyAuth(postHandler));
export const dynamic = "force-dynamic";
