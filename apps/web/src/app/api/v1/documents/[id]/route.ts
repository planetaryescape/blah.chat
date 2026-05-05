import { type NextRequest, NextResponse } from "next/server";
import {
  canvasDAL,
  DocumentVersionConflictError,
  updateDocumentSchema,
} from "@/lib/api/dal/canvas";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";

async function getHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const result = await canvasDAL.get(userId, id);
  return NextResponse.json(result, { status: 200 });
}

async function patchHandler(
  req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const body = updateDocumentSchema.parse(await req.json());
  try {
    const result = await canvasDAL.update(userId, id, body);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof DocumentVersionConflictError) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            message: "Document version conflict",
            code: "version_conflict",
            details: {
              currentVersion: err.currentVersion,
              currentContent: err.currentContent,
            },
          },
        },
        { status: 409 },
      );
    }
    throw err;
  }
}

async function deleteHandler(
  _req: NextRequest,
  {
    params,
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const { id } = (await params) as { id: string };
  const result = await canvasDAL.delete(userId, id);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const PATCH = withErrorHandling(withUserAuth(patchHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
