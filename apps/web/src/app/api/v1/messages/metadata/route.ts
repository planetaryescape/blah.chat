import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseBody } from "@/lib/api/utils";
import { listMessageMetadata } from "@/lib/persistence/messageMetadata";
import { formatEntity } from "@/lib/utils/formatEntity";

const metadataSchema = z.object({
  messageIds: z.array(z.string()).min(1),
});

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await parseBody(req, metadataSchema);
  const result = await listMessageMetadata(userId, {
    messageIds: body.messageIds,
  });

  return NextResponse.json(formatEntity(result, "message.metadata"));
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
