import { useProjectNotes } from "./useProjectNotes";
import { useProjectResources } from "./useProjectResources";
import { useProjectTasks } from "./useProjectTasks";

export type ProjectSurfaceStats = {
  conversationCount: number;
  fileCount: number;
  noteCount: number;
  activeTaskCount: number;
  taskStats: {
    total: number;
    active: number;
    completed: number;
  };
};

export function useProjectSurfaceStats(projectId: string | null) {
  const resources = useProjectResources(projectId);
  const notes = useProjectNotes(projectId);
  const tasks = useProjectTasks(projectId);

  const isLoading = resources.isLoading || notes.isLoading || tasks.isLoading;

  const stats: ProjectSurfaceStats | null = isLoading
    ? null
    : {
        conversationCount: resources.conversations.length,
        fileCount: resources.files.length,
        noteCount: notes.notes.length,
        activeTaskCount: tasks.tasks.filter(
          (task) => task.status !== "completed" && task.status !== "cancelled",
        ).length,
        taskStats: {
          total: tasks.tasks.length,
          active: tasks.tasks.filter(
            (task) =>
              task.status !== "completed" && task.status !== "cancelled",
          ).length,
          completed: tasks.tasks.filter((task) => task.status === "completed")
            .length,
        },
      };

  return {
    resources,
    notes: notes.notes,
    tasks: tasks.tasks,
    stats,
    isLoading,
    error: resources.error ?? notes.error ?? tasks.error ?? null,
  };
}
