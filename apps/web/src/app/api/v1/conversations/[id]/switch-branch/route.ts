import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";

const switchBranchSchema = z.object({
  targetMessageId: z.string().min(1),
});

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const body = await parseBody(req, switchBranchSchema);
  const result = await conversationsDAL.switchBranch(
    userId,
    id,
    body.targetMessageId,
  );

  return NextResponse.json(result);
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
