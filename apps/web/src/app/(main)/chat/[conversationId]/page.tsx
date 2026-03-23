import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { Metadata } from "next";
import ChatConversationPageClient from "./ChatConversationPageClient";

export const metadata: Metadata = {
  title: "Conversation",
  description: "Continue a conversation on blah.chat.",
};

export default function ChatConversationPage(props: {
  params: Promise<{ conversationId: Id<"conversations"> }>;
}) {
  return <ChatConversationPageClient {...props} />;
}
