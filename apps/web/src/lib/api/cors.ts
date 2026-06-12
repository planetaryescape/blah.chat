import type { NextRequest } from "next/server";

const DEFAULT_ALLOW_HEADERS =
  "Authorization, Content-Type, Accept, Cache-Control, X-API-Key";
const DEFAULT_ALLOW_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";

let warnedFallbackOrigins = false;

function getConfiguredOrigins(): string[] {
  const raw =
    process.env.BLAH_API_CORS_ORIGINS || process.env.API_CORS_ORIGINS || "";

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDefaultOrigins(): string[] {
  const origins = new Set<string>(["https://blah.chat"]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed NEXT_PUBLIC_APP_URL; keep the hardcoded default.
    }
  }
  return [...origins];
}

function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV)
  );
}

function resolveAllowOrigin(origin: string | null): string {
  if (!origin) {
    return "*";
  }

  const configuredOrigins = getConfiguredOrigins();
  if (configuredOrigins.length === 0) {
    if (!isProduction()) {
      return "*";
    }
    if (!warnedFallbackOrigins) {
      warnedFallbackOrigins = true;
      // console (not pino): this module is bundled into edge middleware.
      console.warn(
        "No CORS origins configured in production; falling back to the app's own origin(s)",
      );
    }
    const defaults = getDefaultOrigins();
    return defaults.includes(origin) ? origin : "null";
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
