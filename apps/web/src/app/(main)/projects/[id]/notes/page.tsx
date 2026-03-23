import type { Metadata } from "next";
import ProjectNotesPageClient from "./ProjectNotesPageClient";

export const metadata: Metadata = {
  title: "Project Notes",
  description: "Manage project notes stored on the Postgres rewrite stack.",
};

export default function ProjectNotesPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectNotesPageClient {...props} />;
}
