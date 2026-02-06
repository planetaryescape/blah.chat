import { api } from "@blah-chat/backend/convex/_generated/api";
import { type NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/api/convex";
import logger from "@/lib/logger";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

export type ApiKeyAuthContext = {
  params: Promise<Record<string, string | string[]>>;
  apiKey: string;
  user: {
    userId: string;
    email: string;
    name: string;
  };
};

type ApiKeyAuthenticatedHandler = (
  req: NextRequest,
  context: ApiKeyAuthContext,
) => Promise<Response>;

function getApiKeyFromRequest(req: NextRequest): string | null {
  const headerKey = req.headers.get("x-api-key")?.trim();
  if (headerKey) {
    return headerKey;
  }

  const auth = req.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    return token || null;
  }

  return null;
}

export function withApiKeyAuth(handler: ApiKeyAuthenticatedHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ) => {
    const apiKey = getApiKeyFromRequest(req);
    if (!apiKey) {
      return NextResponse.json(formatErrorEntity("API key required"), {
        status: 401,
      });
    }

    try {
      const convex = getConvexClient();
      const user = (await (convex.query as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        api.cliAuth.validate,
        { key: apiKey },
      )) as {
        userId: string;
        email: string;
        name: string;
      } | null;

      if (!user) {
        return NextResponse.json(formatErrorEntity("Invalid API key"), {
          status: 401,
        });
      }

      return handler(req, {
        ...context,
        apiKey,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          url: req.url,
        },
        "API key auth middleware error",
      );

      return NextResponse.json(formatErrorEntity("Internal server error"), {
        status: 500,
      });
    }
  };
}
