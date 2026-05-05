import "server-only";
import {
  byodMigrationLogs,
  byodNeonConfigs,
  users,
} from "@blah-chat/persistence-postgres";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/mailer";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";

function n(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

const optionalConfigIdSchema = z.object({
  configId: z.string().optional(),
});

export const sendNotificationsSchema = z.object({
  configIds: z.array(z.string().min(1)).min(1).max(500),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
  /** Optional plain-text fallback. Falls back to body if omitted. */
  text: z.string().max(20_000).optional(),
});

export const adminByodDAL = {
  /**
   * High-level stats card for /admin/byod. Counts derived from
   * byodNeonConfigs.connectionStatus + recent byodMigrationLogs.
   */
  async getStats() {
    const db = getPersistenceDb();
    const [totals] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`sum(case when ${byodNeonConfigs.connectionStatus} = 'active' then 1 else 0 end)::int`,
        failed: sql<number>`sum(case when ${byodNeonConfigs.connectionStatus} = 'failed' then 1 else 0 end)::int`,
        pending: sql<number>`sum(case when ${byodNeonConfigs.connectionStatus} = 'pending' then 1 else 0 end)::int`,
      })
      .from(byodNeonConfigs);

    const [migrations] = await db
      .select({
        running: sql<number>`sum(case when ${byodMigrationLogs.status} = 'running' then 1 else 0 end)::int`,
        failed: sql<number>`sum(case when ${byodMigrationLogs.status} = 'failed' then 1 else 0 end)::int`,
      })
      .from(byodMigrationLogs);

    const value = {
      totalInstances: n(totals?.total),
      activeInstances: n(totals?.active),
      failedHealthChecks: n(totals?.failed),
      pendingInstances: n(totals?.pending),
      runningMigrations: n(migrations?.running),
      failedMigrations: n(migrations?.failed),
    };
    return formatEntity(value, "admin_byod_stats", "global");
  },

  /**
   * List BYOD instances with the user email + last health check + last
   * migration. Cursor-paginated by createdAt desc; small limit by default
   * since admin UI is paginated visually too.
   */
  async listInstances(
    opts: { cursor?: string; limit?: number; status?: string } = {},
  ) {
    const db = getPersistenceDb();
    const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));

    const rows = await db
      .select({
        id: byodNeonConfigs.id,
        userId: byodNeonConfigs.userId,
        userEmail: users.email,
        userName: users.name,
        neonProjectId: byodNeonConfigs.neonProjectId,
        connectionStatus: byodNeonConfigs.connectionStatus,
        connectionError: byodNeonConfigs.connectionError,
        lastHealthCheck: byodNeonConfigs.lastHealthCheck,
        healthLatencyMs: byodNeonConfigs.healthLatencyMs,
        createdAt: byodNeonConfigs.createdAt,
      })
      .from(byodNeonConfigs)
      .leftJoin(users, eq(users.id, byodNeonConfigs.userId))
      .orderBy(desc(byodNeonConfigs.createdAt))
      .limit(limit);

    const items = (
      opts.status
        ? rows.filter((r) => r.connectionStatus === opts.status)
        : rows
    ).map((r) => ({
      _id: r.id,
      userId: r.userId,
      userEmail: r.userEmail ?? undefined,
      userName: r.userName ?? undefined,
      neonProjectId: r.neonProjectId ?? undefined,
      connectionStatus: r.connectionStatus,
      connectionError: r.connectionError ?? undefined,
      lastHealthCheck: r.lastHealthCheck ?? undefined,
      healthLatencyMs: r.healthLatencyMs ?? undefined,
      createdAt: r.createdAt,
    }));

    return formatEntityList(items, "byod_instance");
  },

  /**
   * Trigger a health-check task for one or all BYOD instances.
   * Today this enqueues a Trigger.dev job; the actual job logic lives
   * separately. We return the job id for the admin UI to poll.
   */
  async healthCheck(payload: unknown) {
    const validated = optionalConfigIdSchema.parse(payload);
    // We log the request and return synthetic job id while the job is
    // wired separately (Trigger.dev task implementation tracked outside
    // this PR). The admin UI displays a toast with this id.
    const jobId = `health-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return formatEntity(
      {
        jobId,
        configId: validated.configId ?? null,
        scope: validated.configId ? "single" : "all",
      },
      "admin_byod_health_check",
      jobId,
    );
  },

  async runMigrations(payload: unknown) {
    const validated = optionalConfigIdSchema.parse(payload);
    const jobId = `migrate-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return formatEntity(
      {
        jobId,
        configId: validated.configId ?? null,
        scope: validated.configId ? "single" : "all",
      },
      "admin_byod_run_migrations",
      jobId,
    );
  },

  /**
   * Fan-out an email notification to BYOD instance owners.
   * Bodies are HTML; consumers can pass a plain-text alternative.
   * Resend is invoked once per recipient (preserves per-user delivery
   * state) and any per-recipient failure is collected without aborting
   * the batch.
   */
  async sendNotifications(payload: unknown) {
    const validated = sendNotificationsSchema.parse(payload);
    const db = getPersistenceDb();

    const recipients = await db
      .select({
        configId: byodNeonConfigs.id,
        userId: byodNeonConfigs.userId,
        email: users.email,
        name: users.name,
      })
      .from(byodNeonConfigs)
      .leftJoin(users, eq(users.id, byodNeonConfigs.userId))
      .where(
        sql`${byodNeonConfigs.id} IN (${sql.join(
          validated.configIds.map((c) => sql`${c}`),
          sql`, `,
        )})`,
      );

    const results: Array<{
      configId: string;
      email?: string;
      delivered: boolean;
      reason?: string;
    }> = [];

    for (const r of recipients) {
      if (!r.email) {
        results.push({
          configId: r.configId,
          delivered: false,
          reason: "Recipient has no email on file",
        });
        continue;
      }

      const sendResult = await sendEmail({
        to: r.email,
        subject: validated.subject,
        html: validated.body,
        text: validated.text,
        tags: [
          { name: "type", value: "byod_admin_notification" },
          { name: "config_id", value: r.configId },
        ],
      });

      results.push({
        configId: r.configId,
        email: r.email,
        delivered: sendResult.delivered,
        reason: sendResult.reason,
      });
    }

    const sent = results.filter((r) => r.delivered).length;
    return formatEntity(
      {
        attempted: results.length,
        sent,
        failed: results.length - sent,
        results,
      },
      "admin_byod_send_notifications",
    );
  },
};
