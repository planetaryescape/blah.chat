import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { userDataDAL } from "@/lib/api/dal/userData";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

const schema = z.object({
  confirmationText: z.string(),
});

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/user/delete-account");
  const body = schema.parse(await req.json());
  const result = await userDataDAL.deleteAccount(userId, body.confirmationText);
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const dynamic = "force-dynamic";
