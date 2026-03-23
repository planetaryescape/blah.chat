import {
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

const transcribeInputSchema = z.object({
  storageId: z.string(),
  mimeType: z.string().optional(),
  model: z.enum(["whisper-1", "whisper-large-v3"]).optional(),
});

async function handler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = Date.now();
  logger.info({ userId }, "POST /api/v1/actions/transcribe");

  const body = await req.json();
  const validated = transcribeInputSchema.parse(body);
  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);

  const run = await trigger.triggerTask("transcribe", validated);
  const jobId = run.id;

  if (!jobId) {
    throw new Error("Trigger run did not return an id");
  }

  const duration = Date.now() - startTime;
  logger.info({ userId, jobId, duration }, "Transcription job created");

  return new Response(
    JSON.stringify(
      formatEntity(
        {
          jobId,
          status: "pending",
          pollUrl: `/api/v1/actions/jobs/${jobId}`,
        },
        "job",
      ),
    ),
    {
      status: 202, // Accepted
      headers: {
        "Content-Type": "application/json",
        Location: `/api/v1/actions/jobs/${jobId}`,
      },
    },
  );
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
