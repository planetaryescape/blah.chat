import { type NextRequest, NextResponse } from "next/server";
import { meetingExtractionDAL } from "@/lib/api/dal/meetingExtraction";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  const body = await req.json();
  logger.info(
    { userId, transcriptLength: body?.transcript?.length ?? 0 },
    "POST /api/v1/actions/extract-meeting",
  );
  const result = await meetingExtractionDAL.extract(userId, body);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
export const maxDuration = 60;
