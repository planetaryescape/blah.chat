import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

type AuthContext = {
  params: Promise<Record<string, string | string[]>>;
  userId: string;
  sessionToken: string;
};

type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => {
    try {
      const { userId, getToken } = await auth();

      if (!userId) {
        logger.warn({ url: req.url }, "Unauthorized request");
        return NextResponse.json(formatErrorEntity("Authentication required"), {
          status: 401,
        });
      }

      // Get session token for Convex authentication
      const sessionToken = await getToken({ template: "convex" });
      if (!sessionToken) {
        logger.warn({ url: req.url, userId }, "No session token available");
        return NextResponse.json(
          formatErrorEntity("Session token unavailable"),
          {
            status: 401,
          },
        );
      }

      return await handler(req, { ...context, userId, sessionToken });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error(
        { error: errorMessage, stack: errorStack, url: req.url },
        "Auth middleware error",
      );
      return NextResponse.json(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
  };
}

export function withOptionalAuth(
  handler: (
    req: NextRequest,
    context: {
      params: Promise<Record<string, string | string[]>>;
      userId?: string;
    },
  ) => Promise<Response>,
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => {
    try {
      const { userId } = await auth();
      return await handler(req, { ...context, userId: userId ?? undefined });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error(
        { error: errorMessage, stack: errorStack, url: req.url },
        "Auth middleware error",
      );
      return NextResponse.json(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
  };
}
