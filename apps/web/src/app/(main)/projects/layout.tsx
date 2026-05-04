import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Group conversations, notes, and knowledge by project for focused workspaces.",
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
