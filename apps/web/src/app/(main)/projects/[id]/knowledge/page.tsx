import type { Metadata } from "next";
import ProjectKnowledgePageClient from "./ProjectKnowledgePageClient";

export const metadata: Metadata = {
  title: "Project Knowledge",
  description: "Manage project knowledge sources on the rewrite stack.",
};

export default function ProjectKnowledgePage(props: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectKnowledgePageClient {...props} />;
}
