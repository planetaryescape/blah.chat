import { type NextRequest, NextResponse } from "next/server";
import { memoriesDAL } from "@/lib/api/dal/memories";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const { searchParams } = new URL(req.url);
  logger.info({ userId }, "GET /api/v1/memories");

  const result = await memoriesDAL.list(userId, {
    category: searchParams.get("category") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    searchQuery: searchParams.get("searchQuery") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  return NextResponse.json(result, { status: 200 });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info({ userId }, "POST /api/v1/memories");

  const result = await memoriesDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

async function deleteHandler(
  _req: NextRequest,
  { userId }: { userId: string },
) {
  logger.info({ userId }, "DELETE /api/v1/memories");

  const result = await memoriesDAL.deleteAll(userId);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withAuth(getHandler));
export const POST = withErrorHandling(withAuth(postHandler));
export const DELETE = withErrorHandling(withAuth(deleteHandler));
export const dynamic = "force-dynamic";
