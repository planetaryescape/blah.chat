import { listProjectAttachments } from "@/lib/persistence/projects";
import { formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

export const projectsDAL = {
  listAttachments: async (clerkUserId: string, projectId: string) => {
    const items = await listProjectAttachments(clerkUserId, projectId);
    return formatEntityList(items, "attachment");
  },
};
