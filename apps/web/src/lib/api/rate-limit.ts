import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

let cachedRedis: Redis | undefined;
const cachedLimiters = new Map<string, Ratelimit>();
let warnedUnconfigured = false;

/**
 * Marker limiter returned when Upstash is unconfigured in a deployed
 * environment. `applyRateLimit` treats it as fail-closed (503) so routes
 * never run unmetered in production.
 */
export const UNCONFIGURED_LIMITER = Symbol.for("blah.rateLimiter.unconfigured");

export type UnconfiguredLimiter = { kind: typeof UNCONFIGURED_LIMITER };

function isUnconfiguredLimiter(
  limiter: Ratelimit | UnconfiguredLimiter,
): limiter is UnconfiguredLimiter {
  return (
    "kind" in limiter &&
    (limiter as UnconfiguredLimiter).kind === UNCONFIGURED_LIMITER
  );
}

function isDeployedEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV)
  );
}

function getRedis(): Redis | undefined {
  if (cachedRedis) return cachedRedis;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return undefined;
  }
  cachedRedis = Redis.fromEnv();
  return cachedRedis;
}

/**
 * Build (or reuse) a sliding-window limiter for the given route prefix.
 *
 * When Upstash isn't configured:
 * - in dev/test, returns undefined so callers skip rate limiting cleanly
 * - in production/Vercel, returns a fail-closed marker so `applyRateLimit`
 *   rejects requests with 503 instead of running unmetered
 */
export function getLimiter(opts: {
  prefix: string;
  limit: number;
  window: `${number} ${"s" | "m" | "h"}`;
}): Ratelimit | UnconfiguredLimiter | undefined {
  const cached = cachedLimiters.get(opts.prefix);
  if (cached) return cached;
  const redis = getRedis();
  if (!redis) {
    if (isDeployedEnvironment()) {
      if (!warnedUnconfigured) {
        warnedUnconfigured = true;
        logger.error(
          { prefix: opts.prefix },
          "Upstash rate limiter is not configured in production; failing closed",
        );
      }
      return { kind: UNCONFIGURED_LIMITER };
    }
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      logger.warn(
        { prefix: opts.prefix },
        "Upstash rate limiter is not configured; skipping rate limits (dev only)",
      );
    }
    return undefined;
  }
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.limit, opts.window),
    prefix: `ratelimit:${opts.prefix}`,
    analytics: false,
  });
  cachedLimiters.set(opts.prefix, limiter);
  return limiter;
}

/**
 * Run a single ratelimit check against the supplied limiter.
 *
 * Returns `null` if the request is allowed through. Returns a `NextResponse`
 * with a 429 envelope and a `Retry-After` header (in seconds) if the bucket
 * is exhausted — callers should return that response immediately.
 *
 * The limiter is injected so route handlers can share configuration but
 * tests can drop in fakes that don't talk to Redis.
 */
export async function applyRateLimit(
  limiter: Ratelimit | UnconfiguredLimiter,
  identifier: string,
): Promise<NextResponse | null> {
  if (isUnconfiguredLimiter(limiter)) {
    return NextResponse.json(
      formatErrorEntity({
        message:
          "Rate limiting is not configured for this environment. Request rejected.",
        code: "rate_limiter_unconfigured",
      }),
      { status: 503 },
    );
  }
  let result: Awaited<ReturnType<Ratelimit["limit"]>>;
  try {
    result = await limiter.limit(identifier);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        identifier,
      },
      "Rate limit check failed",
    );
    return NextResponse.json(
      formatErrorEntity({
        message:
          "Message sending is temporarily unavailable. Please try again in a minute.",
        code: "RATE_LIMIT_SERVICE_UNAVAILABLE",
      }),
      { status: 503 },
    );
  }
  if (result.success) {
    return null;
  }
  const retryAfterMs = Math.max(1_000, result.reset - Date.now());
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
  const response = NextResponse.json(
    formatErrorEntity({
      message: "Too many requests",
      code: "rate_limited",
      details: {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      },
    }),
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

/**
 * Pull a stable identifier off the request for IP-based limits.
 * Falls back through common proxy headers used by Vercel + Cloudflare.
 */
export function identifierFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  return "anonymous";
}

/**
 * Convenience wrapper around getLimiter + applyRateLimit for routes that
 * don't need to share a limiter instance. Returns `null` when allowed,
 * or a 429/503 NextResponse the caller should return immediately.
 */
export async function enforceRateLimit(
  opts: {
    prefix: string;
    limit: number;
    window: `${number} ${"s" | "m" | "h"}`;
  },
  identifier: string,
): Promise<NextResponse | null> {
  const limiter = getLimiter(opts);
  if (!limiter) return null;
  return applyRateLimit(limiter, identifier);
}
