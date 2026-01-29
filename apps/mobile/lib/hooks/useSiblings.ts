import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

export function useSiblings(messageId: Id<"messages"> | undefined) {
  // Type assertion needed due to re-export type inference issue
  const getSiblings = api.messages.getSiblings as FunctionReference<
    "query",
    "public",
    { messageId: Id<"messages"> },
    Doc<"messages">[]
  >;
  return useQuery(getSiblings, messageId ? { messageId } : "skip");
}
