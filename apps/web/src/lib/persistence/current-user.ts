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

function pickPrimaryEmail(user: ClerkSdkUser): string | undefined {
  const direct = user.primaryEmailAddress?.emailAddress;
  if (direct) return direct;
  const list = user.emailAddresses ?? [];
  if (list.length === 0) return undefined;
  const matched = list.find((e) => e.id === user.primaryEmailAddressId);
  return matched?.emailAddress ?? list[0]?.emailAddress;
}

function readEmail(user: ClerkSdkUser): string {
  return pickPrimaryEmail(user) ?? `${user.id}@clerk.local`;
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

type ClaimsDrift = Partial<{ email: string; name: string; imageUrl: string }>;

function detectField<K extends keyof ClaimsDrift>(
  drift: ClaimsDrift,
  key: K,
  claimed: string | undefined,
  current: string | undefined,
) {
  if (claimed && claimed !== current) drift[key] = claimed;
}

function claimsDriftFromRow(
  row: DbUser,
  claims: SessionClaimsLike | null | undefined,
): ClaimsDrift | null {
  if (!claims) return null;
  const drift: ClaimsDrift = {};
  detectField(drift, "email", asString(claims.email), row.email);
  detectField(drift, "name", asString(claims.name), row.name);
  detectField(
    drift,
    "imageUrl",
    asString(claims.imageUrl) ?? asString(claims.picture),
    row.imageUrl ?? undefined,
  );
  return Object.keys(drift).length > 0 ? drift : null;
}

function buildDriftPayload(row: DbUser, drift: ClaimsDrift) {
  return {
    clerkId: row.clerkId,
    email: drift.email ?? row.email,
    name: drift.name ?? row.name,
    imageUrl: drift.imageUrl ?? row.imageUrl ?? undefined,
  };
}

async function applyDrift(repo: UserRepo, row: DbUser, drift: ClaimsDrift) {
  try {
    await repo.upsertFromClerk(buildDriftPayload(row, drift));
  } catch (err) {
    logger.error(
      { err, clerkId: row.clerkId },
      "Background JWT-claims sync failed",
    );
  }
}

function maybeScheduleClaimsSync(
  row: DbUser,
  claims: SessionClaimsLike | null | undefined,
  repo: UserRepo,
) {
  const drift = claimsDriftFromRow(row, claims);
  if (!drift) return;
  after(() => applyDrift(repo, row, drift));
}

async function refreshFromClerkInBackground(repo: UserRepo, row: DbUser) {
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
}

function maybeScheduleTtlRefresh(row: DbUser, repo: UserRepo) {
  if (Date.now() - row.clerkSyncedAt < TTL_MS) return;
  after(() => refreshFromClerkInBackground(repo, row));
}

async function readClerkUserForId(
  expectedClerkId: string,
): Promise<ClerkSdkUser> {
  try {
    const ctx = (await currentUser()) as ClerkSdkUser | null;
    if (ctx && ctx.id === expectedClerkId) return ctx;
  } catch (err) {
    logger.debug(
      { err, clerkId: expectedClerkId },
      "currentUser() unavailable; falling back to clerkClient.users.getUser",
    );
  }

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
