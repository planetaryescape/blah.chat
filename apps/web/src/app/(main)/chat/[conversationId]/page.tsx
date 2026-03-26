import type { Metadata } from "next";
import ChatConversationPageClient from "./ChatConversationPageClient";

export const metadata: Metadata = {
  title: "Conversation",
  description: "Continue a conversation on blah.chat.",
};

export default function ChatConversationPage(props: {
  params: Promise<{ conversationId: string }>;
}) {
  return <ChatConversationPageClient {...props} />;
}
