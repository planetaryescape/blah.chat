import { fetchMutation } from "convex/nextjs";
import type { NextRequest } from "next/server";
import { createTranscribeJob, transcribeInputSchema } from "@/lib/api/dal/jobs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { parseRequestJson } from "@/lib/api/utils";
import logger from "@/lib/logger";
import { formatEntity } from "@/lib/utils/formatEntity";

async function handler(
  req: NextRequest,
  { userId, sessionToken }: { userId: string; sessionToken: string },
) {
  const startTime = Date.now();
  logger.info({ userId }, "POST /api/v1/actions/transcribe");

  const body = parseRequestJson(await req.text());
  const validated = transcribeInputSchema.parse(body);

  const jobId = await createTranscribeJob(
    fetchMutation,
    sessionToken,
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
