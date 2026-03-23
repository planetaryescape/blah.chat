import type { Metadata } from "next";
import ProjectTasksPageClient from "./ProjectTasksPageClient";

export const metadata: Metadata = {
  title: "Project Tasks",
  description: "Manage project tasks stored on the Postgres rewrite stack.",
};

export default function ProjectTasksPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectTasksPageClient {...props} />;
}
