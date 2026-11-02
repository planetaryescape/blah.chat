import type { NextRequest } from "next/server";

const DEFAULT_ALLOW_HEADERS =
  "Authorization, Content-Type, Accept, Cache-Control, X-API-Key";
const DEFAULT_ALLOW_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";

function getConfiguredOrigins(): string[] {
  const raw =
    process.env.BLAH_API_CORS_ORIGINS || process.env.API_CORS_ORIGINS || "";

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveAllowOrigin(origin: string | null): string {
  if (!origin) {
    return "*";
  }

  const configuredOrigins = getConfiguredOrigins();
  if (configuredOrigins.length === 0) {
    return "*";
  }

  return configuredOrigins.includes(origin) ? origin : "null";
}

export function buildCorsHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  const origin = req.headers.get("origin");

  headers.set("Access-Control-Allow-Origin", resolveAllowOrigin(origin));
  headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOW_METHODS);
  headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOW_HEADERS);
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Access-Control-Expose-Headers", "Content-Type, Cache-Control");
  headers.set("Vary", "Origin");

  return headers;
}

export function appendCorsHeaders(
  req: NextRequest,
  response: Response,
): Response {
  const headers = buildCorsHeaders(req);
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  return response;
}
