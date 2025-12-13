import { ProjectLayout } from "@/components/projects/ProjectLayout";
import { Id } from "@/convex/_generated/dataModel";
import { ReactNode } from "react";

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
