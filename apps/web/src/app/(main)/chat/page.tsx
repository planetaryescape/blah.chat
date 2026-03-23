import type { Metadata } from "next";
import ChatPageClient from "./ChatPageClient";

export const metadata: Metadata = {
  title: "Chat",
  description: "Start a new conversation on blah.chat.",
};

export default function ChatPage() {
  return <ChatPageClient />;
}
