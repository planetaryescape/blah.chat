import { type NextRequest, NextResponse } from "next/server";
import { canvasDAL, createDocumentSchema } from "@/lib/api/dal/canvas";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(req: NextRequest, { userId }: { userId: string }) {
  const url = new URL(req.url);
  const result = await canvasDAL.list(
    userId,
    url.searchParams.get("conversationId") ?? undefined,
  );
  return NextResponse.json(result, { status: 200 });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = createDocumentSchema.parse(await req.json());
  const result = await canvasDAL.create(userId, body);
  return NextResponse.json(result, { status: 201 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
