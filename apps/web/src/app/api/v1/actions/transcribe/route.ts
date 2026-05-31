import {
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { signActionJobId } from "@/lib/api/action-jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { applyRateLimit, getLimiter } from "@/lib/api/rate-limit";
import logger from "@/lib/logger";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

const transcribeInputSchema = z.object({
  storageId: z.string(),
  mimeType: z.string().optional(),
  model: z.enum(["whisper-1", "whisper-large-v3"]).optional(),
});

async function handler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = Date.now();
  logger.info({ userId }, "POST /api/v1/actions/transcribe");

  const limiter = getLimiter({
    prefix: "action:transcribe",
    limit: 30,
    window: "1 h",
  });
  if (limiter) {
    const limited = await applyRateLimit(limiter, userId);
    if (limited) return limited;
  }

  const body = await req.json();
  const validated = transcribeInputSchema.parse(body);
  const user = await ensureCurrentPersistenceUser(userId);

  if (!validated.storageId.startsWith(`users/${user.id}/`)) {
    return new Response(JSON.stringify(formatErrorEntity("File not found")), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);

  const run = await trigger.triggerTask("transcribe", {
    ...validated,
    userId: user.id,
  });
  const jobId = run.id;

  if (!jobId) {
    throw new Error("Trigger run did not return an id");
  }
  const signedJobId = signActionJobId(jobId, userId);

  const duration = Date.now() - startTime;
  logger.info({ userId, jobId, duration }, "Transcription job created");

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
      status: 202, // Accepted
      headers: {
        "Content-Type": "application/json",
        Location: `/api/v1/actions/jobs/${signedJobId}`,
      },
    },
  );
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
