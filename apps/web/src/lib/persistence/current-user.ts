import { createUserRepository } from "@blah-chat/persistence-postgres";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { after } from "next/server";
import logger from "@/lib/logger";
import {
  buildClaimsIdentityPayload,
  buildDriftPayload,
  type ClaimsDrift,
  claimsDriftFromRow,
  type SessionClaimsLike,
} from "./clerkClaimsDrift";
import { type ClerkSdkUser, identityFromClerk } from "./clerkIdentity";
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

export type { SessionClaimsLike };

export interface EnsureCurrentUserOptions {
  sessionClaims?: SessionClaimsLike | null;
}

type UserRepo = ReturnType<typeof createUserRepository>;
type DbUser = NonNullable<Awaited<ReturnType<UserRepo["findByClerkId"]>>>;

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

async function fetchFromClerkAndUpsert(
  clerkId: string,
  repo: UserRepo,
  claims: SessionClaimsLike | null | undefined,
) {
  let clerkUser: ClerkSdkUser;
  try {
    clerkUser = await readClerkUserForId(clerkId);
  } catch (err) {
    if (claims) {
      logger.warn(
        { err, clerkId },
        "Falling back to session claims for initial user sync",
      );
      const row = await repo.upsertFromClerk(
        buildClaimsIdentityPayload(clerkId, claims),
      );
      after(() => refreshFromClerkInBackground(repo, row));
      return row;
    }

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

  return fetchFromClerkAndUpsert(expectedClerkId, repo, options.sessionClaims);
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
