import openApiSpec from "@blah-chat/api-client/openapi";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const dynamic = "force-dynamic";
