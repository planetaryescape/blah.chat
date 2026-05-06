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

function isClerkNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: unknown }).status;
  if (status === 404) return true;
  const errors = (err as { errors?: Array<{ code?: unknown }> }).errors;
  return (
    Array.isArray(errors) &&
    errors.some((e) => e?.code === "resource_not_found")
  );
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
  let scanned = 0;
  let updated = 0;
  let deleted = 0;
  let errors = 0;
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
      scanned++;
      try {
        const fresh = await clerk.users.getUser(row.clerkId);
        const nextEmail = readEmail(fresh);
        const nextName = readName(fresh);
        const nextImage = fresh.imageUrl ?? undefined;

        const drift =
          nextEmail !== row.email ||
          nextName !== row.name ||
          (nextImage ?? null) !== (row.imageUrl ?? null);

        if (drift) {
          await repo.upsertFromClerk({
            clerkId: row.clerkId,
            email: nextEmail,
            name: nextName,
            imageUrl: nextImage,
            clerkSyncedAt: now(),
          });
          updated++;
        } else {
          await db
            .update(users)
            .set({ clerkSyncedAt: now() })
            .where(eq(users.id, row.id));
        }
      } catch (err) {
        if (isClerkNotFound(err)) {
          await repo.deleteByClerkId(row.clerkId);
          deleted++;
        } else {
          errors++;
        }
      }
    }

    cursor += batch.length;
  }

  return { scanned, updated, deleted, errors };
}

export const reconcileClerkUsersTask = schedules.task({
  id: "reconcile-clerk-users",
  cron: RECONCILE_CLERK_USERS_CRON,
  maxDuration: 1800,
  retry: { maxAttempts: 2 },
  run: () => reconcileClerkUsers(),
});
