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

  const body = await req.json();
  const validated = imageGenerationSchema.parse(body);
  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);

  const run = await trigger.triggerTask("generate-image", validated);
  const jobId = run.id;

  if (!jobId) {
    throw new Error("Trigger run did not return an id");
  }

  const duration = Date.now() - startTime;
  logger.info({ userId, jobId, duration }, "Image generation job created");

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
      status: 202,
      headers: {
        "Content-Type": "application/json",
        Location: `/api/v1/actions/jobs/${jobId}`,
      },
    },
  );
}

export const POST = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
