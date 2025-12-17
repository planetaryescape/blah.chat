import type { ReactNode } from "react";
import { ProjectLayout } from "@/components/projects/ProjectLayout";
import type { Id } from "@/convex/_generated/dataModel";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ProjectLayout projectId={id as Id<"projects">}>{children}</ProjectLayout>
  );
}
