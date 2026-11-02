import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

function errorResponse(body: unknown, init: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
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
        return errorResponse(
          formatErrorEntity({
            message: error.message,
            code: error.code,
          }),
          {
            status: error.statusCode,
            headers:
              error.code === "RATE_LIMIT_EXCEEDED"
                ? { "Retry-After": "3600" }
                : undefined,
          },
        );
      }

      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        logger.warn({ issues: error.issues, url: req.url }, "Validation error");
        return errorResponse(
          formatErrorEntity({
            message: "Validation failed",
            code: "VALIDATION_ERROR",
            details: error.issues,
          }),
          { status: 400 },
        );
      }

      // Handle Convex errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("rate limit exceeded")) {
          return errorResponse(formatErrorEntity("Rate limit exceeded"), {
            status: 429,
            headers: {
              "Retry-After": "3600",
              "Cache-Control": "private, no-store",
            },
          });
        }

        // Parse common Convex error patterns
        if (message.includes("not found")) {
          logger.warn({ error: message, url: req.url }, "Resource not found");
          return errorResponse(formatErrorEntity("Resource not found"), {
            status: 404,
          });
        }

        if (
          message.includes("not authenticated") ||
          message.includes("unauthorized")
        ) {
          return errorResponse(formatErrorEntity("Authentication required"), {
            status: 401,
          });
        }
        if (
          message.includes("unauthorized") ||
          message.includes("forbidden") ||
          message.includes("permission")
        ) {
          logger.warn({ error: message, url: req.url }, "Unauthorized");
          return errorResponse(formatErrorEntity("Access denied"), {
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

      return errorResponse(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
  };
}
