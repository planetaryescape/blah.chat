import type { Metadata } from "next";
import SmartAssistantPageClient from "./SmartAssistantPageClient";

export const metadata: Metadata = {
  title: "Smart Assistant",
  description: "Review meetings and create notes and tasks from transcripts.",
};

export default function SmartAssistantPage() {
  return <SmartAssistantPageClient />;
}
