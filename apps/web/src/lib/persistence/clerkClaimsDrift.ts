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
  return (
    asNonEmptyString(claims.picture) ??
    asNonEmptyString(claims.image_url) ??
    asNonEmptyString(claims.avatar_url)
  );
}

function pickEmailClaim(claims: SessionClaimsLike): string | undefined {
  return (
    asNonEmptyString(claims.email) ??
    asNonEmptyString(claims.email_address) ??
    asNonEmptyString(claims.primary_email_address) ??
    asNonEmptyString(claims.primaryEmailAddress)
  );
}

function pickNameClaim(claims: SessionClaimsLike): string | undefined {
  const direct =
    asNonEmptyString(claims.name) ??
    asNonEmptyString(claims.full_name) ??
    asNonEmptyString(claims.fullName);
  if (direct) return direct;

  const first =
    asNonEmptyString(claims.first_name) ??
    asNonEmptyString(claims.firstName) ??
    asNonEmptyString(claims.given_name);
  const last =
    asNonEmptyString(claims.last_name) ??
    asNonEmptyString(claims.lastName) ??
    asNonEmptyString(claims.family_name);
  const composed = `${first ?? ""} ${last ?? ""}`.trim();
  return composed.length > 0 ? composed : undefined;
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

export function buildClaimsIdentityPayload(
  clerkId: string,
  claims: SessionClaimsLike,
) {
  return {
    clerkId,
    email: pickEmailClaim(claims) ?? `${clerkId}@clerk.local`,
    name: pickNameClaim(claims) ?? "Anonymous",
    imageUrl: pickImageClaim(claims),
    clerkSyncedAt: 0,
  };
}
