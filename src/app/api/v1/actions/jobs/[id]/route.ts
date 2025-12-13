import { NextRequest } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";
import { getJobById } from "@/lib/api/dal/jobs";
import type { Id } from "@/convex/_generated/dataModel";
import logger from "@/lib/logger";

async function handler(
  req: NextRequest,
  {
    userId,
    params,
  }: { userId: string; params: Promise<Record<string, string | string[]>> },
) {
  const startTime = Date.now();
  const { id } = (await params) as { id: string };

  logger.info({ userId, jobId: id }, "GET /api/v1/actions/jobs/:id");

  const job = await getJobById(fetchQuery, id as Id<"jobs">);

  if (!job) {
    logger.warn({ userId, jobId: id }, "Job not found");
    return new Response(JSON.stringify(formatErrorEntity("Job not found")), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const duration = Date.now() - startTime;
  logger.info(
    { userId, jobId: id, status: job.status, duration },
    "Job status retrieved",
  );

  return new Response(JSON.stringify(formatEntity(job, "job")), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = withErrorHandling(withAuth(handler));
export const dynamic = "force-dynamic";
