import { type NextRequest, NextResponse } from "next/server";
import { adminByodDAL } from "@/lib/api/dal/adminByod";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(req: NextRequest) {
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) ? limitParam : undefined;
  const result = await adminByodDAL.listInstances({ cursor, status, limit });
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withAdminAuth(getHandler));
export const dynamic = "force-dynamic";
