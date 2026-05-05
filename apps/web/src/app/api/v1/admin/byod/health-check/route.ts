import { type NextRequest, NextResponse } from "next/server";
import { adminByodDAL } from "@/lib/api/dal/adminByod";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function postHandler(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await adminByodDAL.healthCheck(body);
  return NextResponse.json(result, { status: 202 });
}

export const POST = withErrorHandling(withAdminAuth(postHandler));
export const dynamic = "force-dynamic";
