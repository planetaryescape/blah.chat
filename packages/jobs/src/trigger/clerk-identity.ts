export interface ClerkUserShape {
  id: string;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

function findEmailById(
  list: Array<{ id: string; emailAddress: string }>,
  id: string,
): string | undefined {
  for (const e of list) {
    if (e.id === id) return e.emailAddress;
  }
  return undefined;
}

function readDirectEmail(user: ClerkUserShape): string | undefined {
  const primary = user.primaryEmailAddress;
  if (!primary) return undefined;
  const value = primary.emailAddress;
  if (typeof value !== "string") return undefined;
  return value;
}

function readListEmail(user: ClerkUserShape): string | undefined {
  const list = user.emailAddresses;
  if (!list) return undefined;
  if (list.length === 0) return undefined;
  const primaryId = user.primaryEmailAddressId;
  if (primaryId) {
    const found = findEmailById(list, primaryId);
    if (found) return found;
  }
  const first = list[0];
  if (!first) return undefined;
  return first.emailAddress;
}

export function readEmail(user: ClerkUserShape): string {
  const fromDirect = readDirectEmail(user);
  if (fromDirect) return fromDirect;
  const fromList = readListEmail(user);
  if (fromList) return fromList;
  return `${user.id}@clerk.local`;
}

function composeFromParts(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  const safeFirst = typeof first === "string" ? first : "";
  const safeLast = typeof last === "string" ? last : "";
  return `${safeFirst} ${safeLast}`.trim();
}

export function readName(user: ClerkUserShape): string {
  const full = user.fullName;
  if (typeof full === "string") {
    const trimmed = full.trim();
    if (trimmed) return trimmed;
  }
  const composed = composeFromParts(user.firstName, user.lastName);
  if (composed) return composed;
  return "Anonymous";
}
