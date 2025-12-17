import { fetchMutation } from "convex/nextjs";
import type { NextRequest } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { createTranscribeJob, transcribeInputSchema } from "@/lib/api/dal/jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

async function handler(req: NextRequest, { userId }: { userId: string }) {
  const startTime = Date.now();
  logger.info({ userId }, "POST /api/v1/actions/transcribe");

  const body = await req.json();
  const validated = transcribeInputSchema.parse(body);

  const jobId = await createTranscribeJob(
    fetchMutation,
    userId as Id<"users">,
    validated,
  );

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
