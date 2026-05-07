import "server-only";

export type ClerkSdkUser = {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
};

function readDirectEmail(user: ClerkSdkUser): string | undefined {
  const primary = user.primaryEmailAddress;
  if (!primary) return undefined;
  return primary.emailAddress ?? undefined;
}

function readListEmail(user: ClerkSdkUser): string | undefined {
  const list = user.emailAddresses;
  if (!list) return undefined;
  if (list.length === 0) return undefined;
  const primaryId = user.primaryEmailAddressId;
  if (primaryId) {
    const matched = list.find((e) => e.id === primaryId);
    if (matched) return matched.emailAddress;
  }
  return list[0]?.emailAddress;
}

export function readClerkEmail(user: ClerkSdkUser): string {
  const fromDirect = readDirectEmail(user);
  if (fromDirect) return fromDirect;
  const fromList = readListEmail(user);
  if (fromList) return fromList;
  return `${user.id}@clerk.local`;
}

export function readClerkName(user: ClerkSdkUser): string {
  const full = user.fullName?.trim();
  if (full) return full;
  const composed = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (composed) return composed;
  return "Anonymous";
}

export function identityFromClerk(user: ClerkSdkUser) {
  return {
    clerkId: user.id,
    email: readClerkEmail(user),
    name: readClerkName(user),
    imageUrl: user.imageUrl ?? undefined,
  };
}
