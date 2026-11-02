import { useQuery } from "convex/react";
import type { Doc } from "@/lib/convex";
import { api } from "@/lib/convex";

type Project = Doc<"projects">;

export function useProjects() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  return useQuery(api.projects.list) as Project[] | undefined;
}
