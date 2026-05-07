import { type NextRequest, NextResponse } from "next/server";
import { getGenerationV2Service } from "@/lib/generation-v2/runtime";
import logger from "@/lib/logger";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

type AuthFailure = { kind: "missing_secret" } | { kind: "unauthorized" };

function authenticateInternalRequest(
  req: NextRequest,
): { ok: true } | { ok: false; failure: AuthFailure } {
  const expected = process.env.INTERNAL_TASK_SECRET;
  if (!expected) {
    return { ok: false, failure: { kind: "missing_secret" } };
  }
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !timingSafeEqual(token, expected)) {
    return { ok: false, failure: { kind: "unauthorized" } };
  }
  return { ok: true };
}

function authFailureResponse(failure: AuthFailure): NextResponse {
  if (failure.kind === "missing_secret") {
    logger.error(
      "INTERNAL_TASK_SECRET is not configured; refusing internal task call",
    );
    return NextResponse.json(
      formatErrorEntity({
        message: "Internal task auth is not configured",
        code: "internal_auth_not_configured",
      }),
      { status: 503 },
    );
  }
  return NextResponse.json(
    formatErrorEntity({ message: "Unauthorized", code: "unauthorized" }),
    { status: 401 },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateInternalRequest(req);
  if (!auth.ok) return authFailureResponse(auth.failure);

  const { id: requestId } = await params;

  try {
    const service = getGenerationV2Service();
    const status = await service.process(requestId);
    return NextResponse.json(
      formatEntity({ requestId, status }, "generationProcess", requestId),
      { status: 200 },
    );
  } catch (error) {
    logger.error(
      { error, requestId },
      "internal process-generation handler failed",
    );
    const message =
      error instanceof Error ? error.message : "Generation processing failed";
    return NextResponse.json(
      formatErrorEntity({ message, code: "process_failed" }),
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
