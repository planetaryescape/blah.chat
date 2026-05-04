import type { Metadata } from "next";
import ProjectsPageClient from "./ProjectsPageClient";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Group conversations, notes, and knowledge by project for focused workspaces.",
};

export default function ProjectsPage() {
  return <ProjectsPageClient />;
}
