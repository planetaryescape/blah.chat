import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project conversations",
  description: "Conversations scoped to this project.",
};

export default function ProjectConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
