import { NextResponse } from "next/server";
import { checkPersistenceHealth } from "@/lib/persistence/health";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

export async function GET() {
  try {
    const persistence = await checkPersistenceHealth();

    return NextResponse.json(
      formatEntity(
        {
          status: "ok",
          timestamp: Date.now(),
          version: "1.0.0",
          persistence,
        },
        "health",
      ),
    );
  } catch (error) {
    return NextResponse.json(
      formatErrorEntity(
        error instanceof Error ? error : "Persistence health check failed",
      ),
      { status: 503 },
    );
  }
}

export const dynamic = "force-dynamic";
