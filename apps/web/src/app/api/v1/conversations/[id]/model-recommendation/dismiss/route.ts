import { NextResponse } from "next/server";
import { conversationsDAL } from "@/lib/api/dal/conversations";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function postHandler(
  _req: Request,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const result = await conversationsDAL.dismissModelRecommendation(userId, id);
  return NextResponse.json(result);
}

export const POST = withErrorHandling(withAuth(postHandler));
export const dynamic = "force-dynamic";
