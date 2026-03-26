import "server-only";
import { createHash } from "node:crypto";
import { cliApiKeys, users } from "@blah-chat/persistence-postgres";
import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatErrorEntity } from "@/lib/utils/formatEntity";

export type ApiKeyAuthContext = {
  params: Promise<Record<string, string | string[]>>;
  apiKey: string;
  user: {
    userId: string;
    clerkId: string;
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

function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
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
      const db = getPersistenceDb();
      const keyHash = hashApiKey(apiKey);

      const result = await db
        .select({
          keyId: cliApiKeys.id,
          userId: cliApiKeys.userId,
          clerkId: users.clerkId,
          email: users.email,
          name: users.name,
        })
        .from(cliApiKeys)
        .innerJoin(users, eq(users.id, cliApiKeys.userId))
        .where(
          and(eq(cliApiKeys.keyHash, keyHash), isNull(cliApiKeys.revokedAt)),
        )
        .limit(1);

      const row = result[0];
      if (!row) {
        return NextResponse.json(formatErrorEntity("Invalid API key"), {
          status: 401,
        });
      }

      // Update lastUsedAt (fire-and-forget)
      db.update(cliApiKeys)
        .set({ lastUsedAt: Date.now() })
        .where(eq(cliApiKeys.id, row.keyId))
        .catch(() => {});

      return handler(req, {
        ...context,
        apiKey,
        user: {
          userId: row.userId,
          clerkId: row.clerkId,
          email: row.email,
          name: row.name,
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
