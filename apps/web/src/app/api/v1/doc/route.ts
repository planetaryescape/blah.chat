import openApiSpec from "@blah-chat/sdk/openapi";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getDocHtml(specUrl: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>blah.chat API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b0f14; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
      });
    </script>
  </body>
</html>`;
}

export function GET(req: NextRequest) {
  const wantsJson =
    req.nextUrl.searchParams.get("format") === "json" ||
    req.headers.get("accept")?.includes("application/json");

  if (wantsJson) {
    return NextResponse.json(openApiSpec, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const specUrl = `${req.nextUrl.origin}/api/v1/openapi.json`;
  return new NextResponse(getDocHtml(specUrl), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const dynamic = "force-dynamic";
