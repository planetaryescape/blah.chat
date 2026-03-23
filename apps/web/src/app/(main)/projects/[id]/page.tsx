import type { Metadata } from "next";
import ProjectPageClient from "./ProjectPageClient";

export const metadata: Metadata = {
  title: "Project Overview",
  description: "Project overview powered by Postgres-backed project surfaces.",
};

export default function ProjectPage(props: {
  params: Promise<{ id: string }>;
}) {
  return <ProjectPageClient {...props} />;
}
