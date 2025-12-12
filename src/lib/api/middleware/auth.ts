import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { formatErrorEntity } from "@/lib/utils/formatEntity";
import logger from "@/lib/logger";

type AuthContext = {
  params: Promise<Record<string, string | string[]>>;
  userId: string;
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
      const { userId } = await auth();

      if (!userId) {
        logger.warn({ url: req.url }, "Unauthorized request");
        return NextResponse.json(formatErrorEntity("Authentication required"), {
          status: 401,
        });
      }

      return await handler(req, { ...context, userId });
    } catch (error) {
      logger.error({ error, url: req.url }, "Auth middleware error");
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
      logger.error({ error, url: req.url }, "Auth middleware error");
      return NextResponse.json(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
  };
}
