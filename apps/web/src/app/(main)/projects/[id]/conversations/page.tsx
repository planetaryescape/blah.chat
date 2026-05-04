import type { Metadata } from "next";
import ProjectConversationsPageClient from "./ProjectConversationsPageClient";

export const metadata: Metadata = {
  title: "Project conversations",
  description: "Conversations scoped to this project.",
};

export default function ProjectConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectConversationsPageClient params={params} />;
}
