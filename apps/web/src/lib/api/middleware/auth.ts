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

/**
 * Like `withUserAuth` but additionally requires the Clerk session to carry
 * `publicMetadata.isAdmin === true`. Returns 403 otherwise.
 */
export function withAdminAuth(
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
        return NextResponse.json(formatErrorEntity("Authentication required"), {
          status: 401,
        });
      }
      const isAdmin =
        (result.sessionClaims?.publicMetadata as { isAdmin?: boolean })
          ?.isAdmin === true;
      if (!isAdmin) {
        return NextResponse.json(formatErrorEntity("Admin only"), {
          status: 403,
        });
      }
      return await handler(req, { ...context, userId: result.userId });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error(
        { error: errorMessage, stack: errorStack, url: req.url },
        "Admin auth middleware error",
      );
      return NextResponse.json(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
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
    const authResult = await (async () => {
      try {
        const result = await auth();
        if (!result.userId) {
          logger.warn({ url: req.url }, "Unauthorized request");
          return NextResponse.json(
            formatErrorEntity("Authentication required"),
            {
              status: 401,
            },
          );
        }

        return { userId: result.userId } as const;
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
