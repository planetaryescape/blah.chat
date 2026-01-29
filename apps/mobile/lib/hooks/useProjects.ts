import { api } from "@blah-chat/backend/convex/_generated/api";
import { useQuery } from "convex/react";

export function useProjects() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  return useQuery(api.projects.list);
}
