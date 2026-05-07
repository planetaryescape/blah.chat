import {
  createNeonDatabase,
  createUserRepository,
  type PersistenceDb,
  users,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { asc, eq } from "drizzle-orm";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export const RECONCILE_CLERK_USERS_CRON = {
  pattern: "0 4 * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

interface ClerkUserShape {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface ClerkLike {
  users: { getUser: (id: string) => Promise<ClerkUserShape> };
}

export interface ReconcileResult {
  scanned: number;
  updated: number;
  deleted: number;
  errors: number;
}

type ClerkErrorShape = { status?: unknown; errors?: unknown };

function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null) return null;
  if (typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function hasNotFoundStatus(err: ClerkErrorShape): boolean {
  return err.status === 404;
}

function hasNotFoundCode(err: ClerkErrorShape): boolean {
  if (!Array.isArray(err.errors)) return false;
  for (const item of err.errors) {
    const obj = asObject(item);
    if (obj && obj.code === "resource_not_found") return true;
  }
  return false;
}

function isClerkNotFound(err: unknown): boolean {
  const obj = asObject(err);
  if (!obj) return false;
  return hasNotFoundStatus(obj) || hasNotFoundCode(obj);
}

function readEmail(user: ClerkUserShape): string {
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    `${user.id}@clerk.local`
  );
}

function readName(user: ClerkUserShape): string {
  return (
    user.fullName?.trim() ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Anonymous"
  );
}

async function defaultClerkClient(): Promise<ClerkLike> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
  const { createClerkClient } = await import("@clerk/backend");
  return createClerkClient({ secretKey }) as unknown as ClerkLike;
}

type UserRow = typeof users.$inferSelect;
type RowOutcome = "updated" | "synced" | "deleted" | "errored";

function hasClerkDrift(row: UserRow, fresh: ClerkUserShape): boolean {
  const nextImage = fresh.imageUrl ?? null;
  return (
    readEmail(fresh) !== row.email ||
    readName(fresh) !== row.name ||
    nextImage !== (row.imageUrl ?? null)
  );
}

async function applyClerkDrift(
  repo: ReturnType<typeof createUserRepository>,
  row: UserRow,
  fresh: ClerkUserShape,
  syncedAt: number,
) {
  await repo.upsertFromClerk({
    clerkId: row.clerkId,
    email: readEmail(fresh),
    name: readName(fresh),
    imageUrl: fresh.imageUrl ?? undefined,
    clerkSyncedAt: syncedAt,
  });
}

async function syncOneRow(
  ctx: {
    db: PersistenceDb;
    clerk: ClerkLike;
    repo: ReturnType<typeof createUserRepository>;
    now: () => number;
  },
  row: UserRow,
): Promise<RowOutcome> {
  try {
    const fresh = await ctx.clerk.users.getUser(row.clerkId);
    if (hasClerkDrift(row, fresh)) {
      await applyClerkDrift(ctx.repo, row, fresh, ctx.now());
      return "updated";
    }
    await ctx.db
      .update(users)
      .set({ clerkSyncedAt: ctx.now() })
      .where(eq(users.id, row.id));
    return "synced";
  } catch (err) {
    if (isClerkNotFound(err)) {
      await ctx.repo.deleteByClerkId(row.clerkId);
      return "deleted";
    }
    return "errored";
  }
}

export async function reconcileClerkUsers(
  deps: {
    db?: PersistenceDb;
    clerk?: ClerkLike;
    batchSize?: number;
    now?: () => number;
  } = {},
): Promise<ReconcileResult> {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const clerk = deps.clerk ?? (await defaultClerkClient());
  const now = deps.now ?? Date.now;
  const batchSize = deps.batchSize ?? 100;
  const repo = createUserRepository(db);

  const totals: ReconcileResult = {
    scanned: 0,
    updated: 0,
    deleted: 0,
    errors: 0,
  };
  const counters: Record<RowOutcome, keyof ReconcileResult> = {
    updated: "updated",
    deleted: "deleted",
    errored: "errors",
    synced: "scanned",
  };
  let cursor = 0;

  while (true) {
    const batch = await db
      .select()
      .from(users)
      .orderBy(asc(users.clerkSyncedAt), asc(users.id))
      .limit(batchSize)
      .offset(cursor);
    if (batch.length === 0) break;

    for (const row of batch) {
      totals.scanned++;
      const outcome = await syncOneRow({ db, clerk, repo, now }, row);
      if (outcome !== "synced") totals[counters[outcome]]++;
    }

    cursor += batch.length;
  }

  return totals;
}

export const reconcileClerkUsersTask = schedules.task({
  id: "reconcile-clerk-users",
  cron: RECONCILE_CLERK_USERS_CRON,
  maxDuration: 1800,
  retry: { maxAttempts: 2 },
  run: () => reconcileClerkUsers(),
});
