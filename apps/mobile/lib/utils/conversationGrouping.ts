export type ConversationGroupLabel =
  | "Pinned"
  | "Today"
  | "Yesterday"
  | "Previous 7 Days"
  | "Previous 30 Days"
  | "Older";

export type GroupedConversations<T> = {
  label: ConversationGroupLabel;
  items: T[];
};

type ConversationShape = {
  _id: string;
  lastMessageAt: number;
  pinned?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function daysAgo(reference: number, target: number): number {
  const referenceStart = startOfDay(reference);
  const targetStart = startOfDay(target);
  return Math.floor((referenceStart - targetStart) / DAY_MS);
}

export function getConversationGroupLabel(
  timestamp: number,
  now = Date.now(),
): Exclude<ConversationGroupLabel, "Pinned"> {
  const diff = daysAgo(now, timestamp);

  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Previous 7 Days";
  if (diff <= 30) return "Previous 30 Days";
  return "Older";
}

export function groupConversationsByRecency<T extends ConversationShape>(
  conversations: T[],
  now = Date.now(),
): GroupedConversations<T>[] {
  const grouped: Record<ConversationGroupLabel, T[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: [],
  };

  for (const conversation of conversations) {
    if (conversation.pinned) {
      grouped.Pinned.push(conversation);
      continue;
    }

    const label = getConversationGroupLabel(conversation.lastMessageAt, now);
    grouped[label].push(conversation);
  }

  const orderedLabels: ConversationGroupLabel[] = [
    "Pinned",
    "Today",
    "Yesterday",
    "Previous 7 Days",
    "Previous 30 Days",
    "Older",
  ];

  return orderedLabels
    .map((label) => ({ label, items: grouped[label] }))
    .filter((group) => group.items.length > 0);
}
