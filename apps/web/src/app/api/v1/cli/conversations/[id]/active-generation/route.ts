import { type NextRequest, NextResponse } from "next/server";
import { cliChatDAL } from "@/lib/api/dal/cliChat";
import { withApiKeyAuth } from "@/lib/api/middleware/apiKeyAuth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

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
  const result = await cliChatDAL.getActiveGeneration(user, conversationId);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return NextResponse.json(result);
}

export const GET = withErrorHandling(withApiKeyAuth(getHandler));
export const dynamic = "force-dynamic";
