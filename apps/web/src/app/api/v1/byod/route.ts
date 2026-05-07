import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { byodDAL } from "@/lib/api/dal/byod";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

const setupSchema = z.object({
  connectionString: z.string().trim().min(1),
});

async function getHandler(_req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "GET /api/v1/byod");
  const config = await byodDAL.get(userId);

  if (!config) {
    return NextResponse.json(formatErrorEntity("BYOD config not found"), {
      status: 404,
    });
  }

  return NextResponse.json(formatEntity(config, "byod", config.id), {
    status: 200,
  });
}

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  // Per-user chat-table routing isn't wired through the generation
  // repository yet — until BYOD_CHAT_ROUTING_ENABLED=1 ships in tandem
  // with that wiring, refuse to enable so users don't think their data is
  // landing in their database when it's still hitting the primary.
  if (process.env.BYOD_CHAT_ROUTING_ENABLED !== "1") {
    logger.info({ userId }, "POST /api/v1/byod refused — preview mode");
    return NextResponse.json(
      formatErrorEntity({
        message:
          "BYOD is in preview — connection capture works but chat data still " +
          "writes to the primary database. Enable BYOD_CHAT_ROUTING_ENABLED " +
          "once per-user chat-table routing ships.",
        code: "byod_preview",
      }),
      { status: 503 },
    );
  }

  logger.info({ userId }, "POST /api/v1/byod");
  const body = setupSchema.parse(await req.json());
  const result = await byodDAL.setup(userId, body.connectionString);
  return NextResponse.json(result, { status: 200 });
}

async function deleteHandler(
  _req: NextRequest,
  { userId }: { userId: string },
) {
  logger.info({ userId }, "DELETE /api/v1/byod");
  const result = await byodDAL.disconnect(userId);
  return NextResponse.json(result, { status: 200 });
}

export const GET = withErrorHandling(withUserAuth(getHandler));
export const POST = withErrorHandling(withUserAuth(postHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
