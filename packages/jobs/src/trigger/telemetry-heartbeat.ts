import {
  createNeonDatabase,
  messages,
  type PersistenceDb,
  users,
} from "@blah-chat/persistence-postgres";
import { count, countDistinct, gt } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function gatherStats(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();
  const cutoff24h = now - TWENTY_FOUR_HOURS_MS;

  const [[totalUsersResult], [messagesResult], [activeUsersResult]] =
    await Promise.all([
      db.select({ value: count() }).from(users),
      db
        .select({ value: count() })
        .from(messages)
        .where(gt(messages.createdAt, cutoff24h)),
      db
        .select({ value: countDistinct(messages.userId) })
        .from(messages)
        .where(gt(messages.createdAt, cutoff24h)),
    ]);

  return {
    totalUsers: totalUsersResult?.value ?? 0,
    messagesLast24h: messagesResult?.value ?? 0,
    activeUsersLast24h: activeUsersResult?.value ?? 0,
  };
}

export async function telemetryHeartbeat(
  deps: { db?: PersistenceDb; now?: number } = {},
) {
  if (process.env.TELEMETRY_DISABLED === "1") {
    return { skipped: true, reason: "TELEMETRY_DISABLED=1" };
  }

  const posthogKey = process.env.POSTHOG_API_KEY;
  if (!posthogKey) {
    return { skipped: true, reason: "POSTHOG_API_KEY not set" };
  }

  const stats = await gatherStats(deps);
  const instanceId = process.env.INSTANCE_ID ?? "unknown";

  await fetch("https://us.i.posthog.com/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: posthogKey,
      event: "instance_heartbeat",
      distinct_id: instanceId,
      properties: {
        version: process.env.APP_VERSION ?? "unknown",
        ...stats,
      },
    }),
  });

  return { sent: true, stats };
}
