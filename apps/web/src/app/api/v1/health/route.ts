import { NextResponse } from "next/server";
import { checkPersistenceHealth, isHealthy } from "@/lib/persistence/health";
import { formatEntity, formatErrorEntity } from "@/lib/utils/formatEntity";

export async function GET() {
  try {
    const persistence = await checkPersistenceHealth();
    const healthy = isHealthy(persistence);

    return NextResponse.json(
      formatEntity(
        {
          status: healthy ? "ok" : "degraded",
          timestamp: Date.now(),
          version: "1.0.0",
          persistence,
        },
        "health",
      ),
      { status: healthy ? 200 : 503 },
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
