import { users } from "@blah-chat/persistence-postgres";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

async function getHandler() {
  const db = getPersistenceDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  return NextResponse.json(
    formatEntity({ count: row?.count ?? 0 }, "admin-user-count", "global"),
    { status: 200 },
  );
}

export const GET = withErrorHandling(withAdminAuth(getHandler));
export const dynamic = "force-dynamic";
