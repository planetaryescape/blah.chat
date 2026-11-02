import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { ReactNode } from "react";
import { ProjectLayout } from "@/components/projects/ProjectLayout";

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
