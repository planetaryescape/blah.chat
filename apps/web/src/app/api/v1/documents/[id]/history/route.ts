import { type NextRequest, NextResponse } from "next/server";
import { canvasDAL } from "@/lib/api/dal/canvas";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const url = new URL(req.url);
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";

  // Clamp to 500 (not 100): the canvas history client legitimately asks for 200.
  const result = await canvasDAL.listHistory(userId, id, {
    limit: Number.isFinite(limitParam)
      ? Math.min(500, Math.max(1, limitParam))
      : undefined,
    order,
  });
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const dynamic = "force-dynamic";
