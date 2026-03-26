import { type NextRequest, NextResponse } from "next/server";
import { projectsDAL } from "@/lib/api/dal/projects";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: {
    params: Promise<Record<string, string | string[]>>;
    userId: string;
  },
) {
  const { id } = (await params) as { id: string };
  const body = await req.json();
  logger.info(
    { userId, projectId: id },
    "POST /api/v1/projects/[id]/assign-conversations",
  );
  const result = await projectsDAL.assignConversations(userId, {
    projectId: "projectId" in body ? body.projectId : id,
    conversationIds: body.conversationIds,
  });
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
