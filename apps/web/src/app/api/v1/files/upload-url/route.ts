import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { filesDAL } from "@/lib/api/dal/files";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";

const uploadSchema = z.object({
  conversationId: z.string().min(1).optional(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

async function postHandler(
  req: NextRequest,
  {
    userId,
  }: { params: Promise<Record<string, string | string[]>>; userId: string },
) {
  const body = await parseBody(req, uploadSchema);
  const result = await filesDAL.createUploadUrl(userId, body);
  return NextResponse.json(result);
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
