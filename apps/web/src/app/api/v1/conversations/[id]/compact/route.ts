import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";

const compactSchema = z.object({
  targetModel: z.string().optional(),
});

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const body = await parseBody(req, compactSchema);
  const result = await conversationsDAL.compact(userId, id, body.targetModel);
  return NextResponse.json(result, { status: 202 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
