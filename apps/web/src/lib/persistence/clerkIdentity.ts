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

export function readClerkEmail(user: ClerkSdkUser): string {
  const direct = user.primaryEmailAddress?.emailAddress;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const list = user.emailAddresses;
  if (!Array.isArray(list) || list.length === 0) {
    return `${user.id}@clerk.local`;
  }
  const primaryId = user.primaryEmailAddressId;
  if (primaryId) {
    for (const entry of list) {
      if (entry.id === primaryId) return entry.emailAddress;
    }
  }
  return list[0].emailAddress;
}

export function readClerkName(user: ClerkSdkUser): string {
  const fullTrim =
    typeof user.fullName === "string" ? user.fullName.trim() : "";
  if (fullTrim) return fullTrim;
  const first = typeof user.firstName === "string" ? user.firstName : "";
  const last = typeof user.lastName === "string" ? user.lastName : "";
  const composed = `${first} ${last}`.trim();
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
