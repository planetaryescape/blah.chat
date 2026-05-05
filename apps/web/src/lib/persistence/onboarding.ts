import {
  type OnboardingFlags,
  userOnboarding,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";

export type OnboardingRow = typeof userOnboarding.$inferSelect;

async function readOnboardingRow(userPersistenceId: string) {
  const db = getPersistenceDb();
  return db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, userPersistenceId),
  });
}

async function insertDefaultOnboarding(userPersistenceId: string) {
  const db = getPersistenceDb();
  const now = Date.now();
  const [row] = await db
    .insert(userOnboarding)
    .values({
      userId: userPersistenceId,
      flags: {},
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: userOnboarding.userId })
    .returning();
  return row ?? (await readOnboardingRow(userPersistenceId));
}

export async function getOnboarding(clerkUserId: string) {
  const user = await ensureCurrentPersistenceUser(clerkUserId);
  const existing = await readOnboardingRow(user.id);
  if (existing) return existing;
  const created = await insertDefaultOnboarding(user.id);
  if (!created) {
    throw new Error("Failed to create onboarding row");
  }
  return created;
}

interface OnboardingPatch {
  tourCompleted?: boolean;
  tourSkipped?: boolean;
  autoRouterPreferenceSet?: boolean;
  flags?: OnboardingFlags;
}

function resolveTourCompletedAt(
  current: OnboardingRow,
  next: boolean,
  now: number,
) {
  if (next === current.tourCompleted) return current.tourCompletedAt;
  return next ? now : null;
}

export async function updateOnboarding(
  clerkUserId: string,
  patch: OnboardingPatch,
) {
  const row = await getOnboarding(clerkUserId);
  const db = getPersistenceDb();
  const now = Date.now();
  const nextTourCompleted = patch.tourCompleted ?? row.tourCompleted;

  const [updated] = await db
    .update(userOnboarding)
    .set({
      tourCompleted: nextTourCompleted,
      tourSkipped: patch.tourSkipped ?? row.tourSkipped,
      tourCompletedAt: resolveTourCompletedAt(row, nextTourCompleted, now),
      autoRouterPreferenceSet:
        patch.autoRouterPreferenceSet ?? row.autoRouterPreferenceSet,
      flags: patch.flags ? { ...row.flags, ...patch.flags } : row.flags,
      updatedAt: now,
    })
    .where(eq(userOnboarding.userId, row.userId))
    .returning();

  if (!updated) {
    throw new Error("Failed to update onboarding row");
  }
  return updated;
}

export async function resetOnboarding(clerkUserId: string) {
  const row = await getOnboarding(clerkUserId);
  const db = getPersistenceDb();
  const [updated] = await db
    .update(userOnboarding)
    .set({
      tourCompleted: false,
      tourSkipped: false,
      tourCompletedAt: null,
      updatedAt: Date.now(),
    })
    .where(eq(userOnboarding.userId, row.userId))
    .returning();

  if (!updated) {
    throw new Error("Failed to reset onboarding row");
  }
  return updated;
}
