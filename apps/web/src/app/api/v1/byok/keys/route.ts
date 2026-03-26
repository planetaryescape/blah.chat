import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { byokDAL } from "@/lib/api/dal/byok";
import { withUserAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import type { KeyType } from "@/lib/security/byok";

const keyTypeSchema = z.enum([
  "vercelGateway",
  "openRouter",
  "groq",
  "deepgram",
]);

const saveSchema = z.object({
  keyType: keyTypeSchema,
  apiKey: z.string().trim().min(1),
  skipValidation: z.boolean().optional(),
});

const removeSchema = z.object({
  keyType: keyTypeSchema,
});

async function postHandler(req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "POST /api/v1/byok/keys");
  const body = saveSchema.parse(await req.json());
  const result = await byokDAL.saveKey(userId, body);
  return NextResponse.json(result, { status: 200 });
}

async function deleteHandler(req: NextRequest, { userId }: { userId: string }) {
  logger.info({ userId }, "DELETE /api/v1/byok/keys");
  const body = removeSchema.parse(await req.json());
  const result = await byokDAL.removeKey(userId, body as { keyType: KeyType });
  return NextResponse.json(result, { status: 200 });
}

export const POST = withErrorHandling(withUserAuth(postHandler));
export const DELETE = withErrorHandling(withUserAuth(deleteHandler));
export const dynamic = "force-dynamic";
