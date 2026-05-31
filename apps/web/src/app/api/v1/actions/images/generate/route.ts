import {
  conversations,
  createTriggerClient,
  messages,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { signActionJobId } from "@/lib/api/action-jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { applyRateLimit, getLimiter } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

const imageGenerationSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  prompt: z.string().min(1),
  model: z.string().optional(),
  referenceImageStorageId: z.string().optional(),
  thinkingEffort: z.enum(["none", "low", "medium", "high"]).optional(),
});

async function handler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = Date.now();
  logger.info({ userId }, "POST /api/v1/actions/images/generate");

  const limiter = getLimiter({
    prefix: "action:image-generation",
    limit: 20,
    window: "1 h",
  });
  if (limiter) {
    const limited = await applyRateLimit(limiter, userId);
    if (limited) return limited;
  }

  const body = await req.json();
  const validated = imageGenerationSchema.parse(body);
  const user = await ensureCurrentPersistenceUser(userId);
  const db = getPersistenceDb();
  const conversation = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, validated.conversationId),
      eq(conversations.userId, user.id),
    ),
  });

  if (!conversation) {
    return new Response(
      JSON.stringify(formatErrorEntity("Conversation not found")),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const assistantMessage = await db.query.messages.findFirst({
    where: and(
      eq(messages.id, validated.messageId),
      eq(messages.conversationId, validated.conversationId),
      eq(messages.userId, user.id),
      eq(messages.role, "assistant"),
    ),
  });

  if (!assistantMessage) {
    return new Response(
      JSON.stringify(formatErrorEntity("Message not found")),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (
    validated.referenceImageStorageId &&
    !validated.referenceImageStorageId.startsWith(`users/${user.id}/`)
  ) {
    return new Response(JSON.stringify(formatErrorEntity("File not found")), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);

  const run = await trigger.triggerTask("generate-image", {
    ...validated,
    userId: user.id,
  });
  const jobId = run.id;

  if (!jobId) {
    throw new Error("Trigger run did not return an id");
  }
  const signedJobId = signActionJobId(jobId, userId);

  const duration = Date.now() - startTime;
  logger.info({ userId, jobId, duration }, "Image generation job created");

  return new Response(
    JSON.stringify(
      formatEntity(
        {
          jobId: signedJobId,
          status: "pending",
          pollUrl: `/api/v1/actions/jobs/${signedJobId}`,
        },
        "job",
      ),
    ),
    {
      status: 202,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/v1/actions/jobs/${signedJobId}`,
      },
    },
  );
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
