import openApiSpec from "@blah-chat/sdk/openapi";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const dynamic = "force-dynamic";
