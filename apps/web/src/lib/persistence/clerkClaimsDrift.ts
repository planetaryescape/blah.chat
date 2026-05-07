import "server-only";

export interface SessionClaimsLike {
  email?: unknown;
  name?: unknown;
  imageUrl?: unknown;
  picture?: unknown;
  [key: string]: unknown;
}

export interface DbUserLike {
  email: string;
  name: string;
  imageUrl: string | null;
}

export type ClaimsDrift = Partial<{
  email: string;
  name: string;
  imageUrl: string;
}>;

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;
  return value;
}

function pickImageClaim(claims: SessionClaimsLike): string | undefined {
  const direct = asNonEmptyString(claims.imageUrl);
  if (direct) return direct;
  return asNonEmptyString(claims.picture);
}

function compareField(
  drift: ClaimsDrift,
  key: keyof ClaimsDrift,
  claim: string | undefined,
  current: string | undefined,
) {
  if (!claim) return;
  if (claim === current) return;
  drift[key] = claim;
}

export function claimsDriftFromRow(
  row: DbUserLike,
  claims: SessionClaimsLike | null | undefined,
): ClaimsDrift | null {
  if (!claims) return null;
  const drift: ClaimsDrift = {};
  compareField(drift, "email", asNonEmptyString(claims.email), row.email);
  compareField(drift, "name", asNonEmptyString(claims.name), row.name);
  const currentImage = row.imageUrl === null ? undefined : row.imageUrl;
  compareField(drift, "imageUrl", pickImageClaim(claims), currentImage);
  if (Object.keys(drift).length === 0) return null;
  return drift;
}

export function buildDriftPayload(
  row: {
    clerkId: string;
    email: string;
    name: string;
    imageUrl: string | null;
  },
  drift: ClaimsDrift,
) {
  const fallbackImage = row.imageUrl === null ? undefined : row.imageUrl;
  return {
    clerkId: row.clerkId,
    email: drift.email ?? row.email,
    name: drift.name ?? row.name,
    imageUrl: drift.imageUrl ?? fallbackImage,
  };
}
