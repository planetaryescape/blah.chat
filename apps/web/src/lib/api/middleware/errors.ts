import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

const CONFIGURATION_ENV_KEYS = new Set([
  "DATABASE_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
  "R2_ENDPOINT_URL",
  "R2_REGION",
  "R2_FORCE_PATH_STYLE",
  "R2_PUBLIC_BASE_URL",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_API_URL",
]);

type ZodLikeIssue = {
  path: PropertyKey[];
};

function isZodLikeIssue(issue: unknown): issue is ZodLikeIssue {
  return (
    typeof issue === "object" &&
    issue !== null &&
    "path" in issue &&
    Array.isArray(issue.path)
  );
}

function isZodLikeError(error: unknown): error is { issues: ZodLikeIssue[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray(error.issues) &&
    error.issues.every(isZodLikeIssue)
  );
}

function isConfigurationZodError(error: { issues: ZodLikeIssue[] }): boolean {
  return error.issues.some((issue) =>
    issue.path.some(
      (segment) =>
        typeof segment === "string" && CONFIGURATION_ENV_KEYS.has(segment),
    ),
  );
}

export function withErrorHandling(
  handler: (req: NextRequest, context: any) => Promise<Response>,
) {
  return async (req: NextRequest, context: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Handle API errors
      if (error instanceof ApiError) {
        logger.warn(
          { error: error.message, code: error.code, url: req.url },
          "API error",
        );
        return NextResponse.json(
          formatErrorEntity({
            message: error.message,
            code: error.code,
          }),
          { status: error.statusCode },
        );
      }

      // Handle Zod validation errors
      if (error instanceof z.ZodError || isZodLikeError(error)) {
        if (isConfigurationZodError(error)) {
          logger.error({ issues: error.issues, url: req.url }, "Config error");
          return NextResponse.json(
            formatErrorEntity({
              message: "Service configuration error",
              code: "CONFIGURATION_ERROR",
            }),
            { status: 503 },
          );
        }

        logger.warn({ issues: error.issues, url: req.url }, "Validation error");
        return NextResponse.json(
          formatErrorEntity({
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: error.issues,
          }),
          { status: 400 },
        );
      }

      // Handle API errors
      if (error instanceof Error) {
        const message = error.message;

        // Parse common API error patterns
        if (message.includes("not found")) {
          logger.warn({ error: message, url: req.url }, "Resource not found");
          return NextResponse.json(formatErrorEntity("Resource not found"), {
            status: 404,
          });
        }

        if (
          message.includes("unauthorized") ||
          message.includes("permission")
        ) {
          logger.warn({ error: message, url: req.url }, "Unauthorized");
          return NextResponse.json(formatErrorEntity("Access denied"), {
            status: 403,
          });
        }
      }

      // Unhandled error
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          url: req.url,
        },
        "Unhandled error",
      );

      return NextResponse.json(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
  };
}
