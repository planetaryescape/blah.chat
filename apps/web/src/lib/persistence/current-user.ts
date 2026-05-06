import { createUserRepository } from "@blah-chat/persistence-postgres";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { after } from "next/server";
import logger from "@/lib/logger";
import { getPersistenceDb } from "./server";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class UserSyncError extends Error {
  override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "UserSyncError";
    this.cause = cause;
  }
}

export interface SessionClaimsLike {
  email?: unknown;
  name?: unknown;
  imageUrl?: unknown;
  picture?: unknown;
  [key: string]: unknown;
}

export interface EnsureCurrentUserOptions {
  sessionClaims?: SessionClaimsLike | null;
}

type ClerkSdkUser = {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
};

type UserRepo = ReturnType<typeof createUserRepository>;
type DbUser = NonNullable<Awaited<ReturnType<UserRepo["findByClerkId"]>>>;

function readEmail(user: ClerkSdkUser): string {
  const primary =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress;
  return primary ?? `${user.id}@clerk.local`;
}

function readName(user: ClerkSdkUser): string {
  return (
    user.fullName?.trim() ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    "Anonymous"
  );
}

function identityFromClerk(user: ClerkSdkUser) {
  return {
    clerkId: user.id,
    email: readEmail(user),
    name: readName(user),
    imageUrl: user.imageUrl ?? undefined,
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function claimsDriftFromRow(
  row: DbUser,
  claims: SessionClaimsLike | null | undefined,
): Partial<{ email: string; name: string; imageUrl: string }> | null {
  if (!claims) return null;
  const claimEmail = asString(claims.email);
  const claimName = asString(claims.name);
  const claimImage = asString(claims.imageUrl) ?? asString(claims.picture);

  const drift: Partial<{ email: string; name: string; imageUrl: string }> = {};
  if (claimEmail && claimEmail !== row.email) drift.email = claimEmail;
  if (claimName && claimName !== row.name) drift.name = claimName;
  if (claimImage && claimImage !== (row.imageUrl ?? undefined))
    drift.imageUrl = claimImage;

  return Object.keys(drift).length > 0 ? drift : null;
}

function maybeScheduleClaimsSync(
  row: DbUser,
  claims: SessionClaimsLike | null | undefined,
  repo: UserRepo,
) {
  const drift = claimsDriftFromRow(row, claims);
  if (!drift) return;

  after(async () => {
    try {
      await repo.upsertFromClerk({
        clerkId: row.clerkId,
        email: drift.email ?? row.email,
        name: drift.name ?? row.name,
        imageUrl: drift.imageUrl ?? row.imageUrl ?? undefined,
      });
    } catch (err) {
      logger.error(
        { err, clerkId: row.clerkId },
        "Background JWT-claims sync failed",
      );
    }
  });
}

function maybeScheduleTtlRefresh(row: DbUser, repo: UserRepo) {
  if (Date.now() - row.clerkSyncedAt < TTL_MS) return;

  after(async () => {
    try {
      const clerk = await clerkClient();
      const fresh = (await clerk.users.getUser(row.clerkId)) as ClerkSdkUser;
      await repo.upsertFromClerk(identityFromClerk(fresh));
    } catch (err) {
      logger.error(
        { err, clerkId: row.clerkId },
        "Background TTL refresh from Clerk failed",
      );
    }
  });
}

async function readClerkUserForId(
  expectedClerkId: string,
): Promise<ClerkSdkUser> {
  // Fast path: currentUser() rides the existing request context (no extra
  // round-trip when Clerk has hydrated the session).
  try {
    const ctx = (await currentUser()) as ClerkSdkUser | null;
    if (ctx && ctx.id === expectedClerkId) return ctx;
  } catch (err) {
    logger.debug(
      { err, clerkId: expectedClerkId },
      "currentUser() unavailable; falling back to clerkClient.users.getUser",
    );
  }

  // Direct path: clerkClient.users.getUser uses CLERK_SECRET_KEY and is not
  // sensitive to first-sign-in session-context propagation timing.
  const clerk = await clerkClient();
  return (await clerk.users.getUser(expectedClerkId)) as ClerkSdkUser;
}

async function fetchFromClerkAndUpsert(clerkId: string, repo: UserRepo) {
  let clerkUser: ClerkSdkUser;
  try {
    clerkUser = await readClerkUserForId(clerkId);
  } catch (err) {
    throw new UserSyncError(
      `Could not load Clerk user for clerkId=${clerkId}`,
      err,
    );
  }

  return repo.upsertFromClerk(identityFromClerk(clerkUser));
}

export async function ensureCurrentPersistenceUser(
  expectedClerkId: string,
  options: EnsureCurrentUserOptions = {},
) {
  const repo = createUserRepository(getPersistenceDb());
  const existing = await repo.findByClerkId(expectedClerkId);

  if (existing) {
    maybeScheduleClaimsSync(existing, options.sessionClaims, repo);
    maybeScheduleTtlRefresh(existing, repo);
    return existing;
  }

  return fetchFromClerkAndUpsert(expectedClerkId, repo);
}

export async function ensurePersistenceUserFromIdentity(input: {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
}) {
  const repo = createUserRepository(getPersistenceDb());
  return repo.upsertFromClerk(input);
}
