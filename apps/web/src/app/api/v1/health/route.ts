import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { NextResponse } from "next/server";
import { formatEntity } from "@/lib/utils/formatEntity";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  let ready = false;
  if (url) {
    try {
      const client = new ConvexHttpClient(url);
      const health = await client.query(
        makeFunctionReference<
          "query",
          Record<string, never>,
          { backend: "convex"; modelsReady: boolean }
        >("deploymentHealth:check"),
        {},
      );
      ready = health.backend === "convex" && health.modelsReady;
    } catch {
      // Do not expose deployment errors or configuration in a public response.
    }
  }
  return NextResponse.json(
    formatEntity(
      {
        status: ready ? "ok" : "degraded",
        backend: "convex",
        persistence: { convex: { status: ready ? "ok" : "error" } },
        timestamp: Date.now(),
        version: "1.0.0",
      },
      "health",
    ),
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

export const dynamic = "force-dynamic";
