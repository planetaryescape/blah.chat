import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

type AuthContext = {
  params: Promise<Record<string, string | string[]>>;
  userId: string;
};

type UserOnlyAuthContext = {
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
    const authResult = await (async () => {
      try {
        const result = await auth();
        const authedUserId = result.userId;
        if (!authedUserId) {
          logger.warn({ url: req.url }, "Unauthorized request");
          return NextResponse.json(
            formatErrorEntity("Authentication required"),
            {
              status: 401,
            },
          );
        }

        return { userId: authedUserId } as const;
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
    })();

    if (authResult instanceof Response) return authResult;
    return await handler(req, { ...context, ...authResult });
  };
}

type LegacyConvexAuthContext = {
  params: Promise<Record<string, string | string[]>>;
  userId: string;
  sessionToken: string;
};

type LegacyConvexAuthenticatedHandler = (
  req: NextRequest,
  context: LegacyConvexAuthContext,
) => Promise<Response>;

export function withLegacyConvexAuth(
  handler: LegacyConvexAuthenticatedHandler,
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => {
    const authResult = await (async () => {
      try {
        const result = await auth();
        const authedUserId = result.userId;
        const getToken = result.getToken;

        if (!authedUserId) {
          logger.warn({ url: req.url }, "Unauthorized request");
          return NextResponse.json(
            formatErrorEntity("Authentication required"),
            {
              status: 401,
            },
          );
        }

        const token = await getToken({ template: "convex" });
        if (!token) {
          logger.warn(
            { url: req.url, userId: authedUserId },
            "No legacy convex session token available",
          );
          return NextResponse.json(
            formatErrorEntity("Session token unavailable"),
            {
              status: 401,
            },
          );
        }

        return { userId: authedUserId, sessionToken: token } as const;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(
          { error: errorMessage, stack: errorStack, url: req.url },
          "Legacy auth middleware error",
        );
        return NextResponse.json(formatErrorEntity("Internal server error"), {
          status: 500,
        });
      }
    })();

    if (authResult instanceof Response) return authResult;
    return await handler(req, { ...context, ...authResult });
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
    const authResult = await (async () => {
      try {
        const result = await auth();
        return { userId: result.userId ?? undefined } as const;
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
    })();

    if (authResult instanceof Response) return authResult;
    return await handler(req, { ...context, ...authResult });
  };
}

export function withUserAuth(
  handler: (
    req: NextRequest,
    context: UserOnlyAuthContext,
  ) => Promise<Response>,
) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => {
    try {
      const result = await auth();
      if (!result.userId) {
        logger.warn({ url: req.url }, "Unauthorized request");
        return NextResponse.json(formatErrorEntity("Authentication required"), {
          status: 401,
        });
      }

      return await handler(req, {
        ...context,
        userId: result.userId,
      });
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
