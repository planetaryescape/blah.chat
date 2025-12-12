import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { formatErrorEntity } from "@/lib/utils/formatEntity";
import logger from "@/lib/logger";

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
      if (error instanceof z.ZodError) {
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

      // Handle Convex errors
      if (error instanceof Error) {
        const message = error.message;

        // Parse common Convex error patterns
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
