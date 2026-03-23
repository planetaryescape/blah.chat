import type { Metadata } from "next";
import ProjectFilesPageClient from "./ProjectFilesPageClient";

export const metadata: Metadata = {
  title: "Project Files",
  description: "Manage project files stored on the Postgres rewrite stack.",
};

export default function ProjectFilesPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectFilesPageClient {...props} />;
}
