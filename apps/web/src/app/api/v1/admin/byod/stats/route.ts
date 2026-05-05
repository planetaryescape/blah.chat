import { NextResponse } from "next/server";
import { adminByodDAL } from "@/lib/api/dal/adminByod";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler() {
  const result = await adminByodDAL.getStats();
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withAdminAuth(getHandler));
export const dynamic = "force-dynamic";
