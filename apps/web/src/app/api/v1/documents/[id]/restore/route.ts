import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canvasDAL } from "@/lib/api/dal/canvas";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

const restoreSchema = z.object({
  revisionId: z.string().min(1),
});

async function postHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const body = restoreSchema.parse(await req.json());
  const result = await canvasDAL.restore(userId, id, body.revisionId);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
