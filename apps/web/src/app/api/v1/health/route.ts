import { NextResponse } from "next/server";
import { formatEntity } from "@/lib/utils/formatEntity";

export async function GET() {
  return NextResponse.json(
    formatEntity(
      {
        status: "ok",
        timestamp: Date.now(),
        version: "1.0.0",
      },
      "health",
    ),
  );
}

export const dynamic = "force-dynamic";
