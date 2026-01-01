import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { CheckSquare } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAB } from "@/components/ui/FAB";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

// Explicit type to avoid Convex type depth issues
interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  deadline?: number;
  urgency?: "low" | "medium" | "high" | "urgent";
  projectId?: string;
  tags?: string[];
  updatedAt: number;
}

interface Project {
  _id: string;
  name: string;
}

type ViewFilter = "all" | "today" | "important" | "completed";

const FILTERS: { id: ViewFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "important", label: "Important" },
  { id: "completed", label: "Completed" },
];

export default function TasksScreen() {
  const router = useRouter();
  const formRef = useRef<BottomSheetModal>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const allTasks = useQuery(api.tasks.list) as Task[] | undefined;
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const todayTasks = useQuery(api.tasks.getToday) as Task[] | undefined;
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const projects = useQuery(api.projects.list) as Project[] | undefined;

  // Create a map of project IDs to names
  const projectMap = useMemo(() => {
    if (!projects) return new Map<string, string>();
    return new Map(projects.map((p) => [p._id, p.name]));
  }, [projects]);

  // Mutations
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createTask = useMutation(api.tasks.create);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const updateTask = useMutation(api.tasks.update);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const completeTask = useMutation(api.tasks.complete);

  // Compute filtered tasks client-side
  const tasks = useMemo(() => {
    if (!allTasks) return undefined;
    switch (viewFilter) {
      case "today":
        return todayTasks;
      case "important":
        return allTasks.filter(
          (t) =>
            (t.urgency === "urgent" || t.urgency === "high") &&
            t.status !== "completed",
        );
      case "completed":
        return allTasks.filter((t) => t.status === "completed");
      default:
        return allTasks.filter((t) => t.status !== "completed");
    }
  }, [viewFilter, allTasks, todayTasks]);

  // Add project names to tasks
  const tasksWithProjects = useMemo(() => {
    if (!tasks) return undefined;
    return tasks.map((task) => ({
      ...task,
      projectName: task.projectId ? projectMap.get(task.projectId) : undefined,
    }));
  }, [tasks, projectMap]);

  const handleCreate = useCallback(
    async (data: {
      title: string;
      description?: string;
      deadline?: number;
      urgency?: "low" | "medium" | "high" | "urgent";
      projectId?: string;
    }) => {
      await (
        createTask as (args: {
          title: string;
          description?: string;
          deadline?: number;
          urgency?: "low" | "medium" | "high" | "urgent";
          projectId?: Id<"projects">;
        }) => Promise<string>
      )({
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        urgency: data.urgency,
        projectId: data.projectId as Id<"projects"> | undefined,
      });
      haptics.success();
    },
    [createTask],
  );

  const handleToggleComplete = useCallback(
    async (task: Task) => {
      haptics.light();
      if (task.status === "completed") {
        await (
          updateTask as (args: {
            id: Id<"tasks">;
            status: string;
          }) => Promise<void>
        )({
          id: task._id as Id<"tasks">,
          status: "in_progress",
        });
      } else {
        await (completeTask as (args: { id: Id<"tasks"> }) => Promise<void>)({
          id: task._id as Id<"tasks">,
        });
      }
      haptics.success();
    },
    [updateTask, completeTask],
  );

  const handleToggleUrgency = useCallback(
    async (task: Task) => {
      haptics.light();
      const isImportant = task.urgency === "urgent" || task.urgency === "high";
      await (
        updateTask as (args: {
          id: Id<"tasks">;
          urgency: string;
        }) => Promise<void>
      )({
        id: task._id as Id<"tasks">,
        urgency: isImportant ? "low" : "urgent",
      });
      haptics.success();
    },
    [updateTask],
  );

  const renderTask = useCallback(
    ({ item }: { item: Task & { projectName?: string } }) => (
      <TaskCard
        task={item}
        onPress={() => router.push(`/tasks/${item._id}` as never)}
        onToggleComplete={() => handleToggleComplete(item)}
        onToggleUrgency={() => handleToggleUrgency(item)}
      />
    ),
    [router, handleToggleComplete, handleToggleUrgency],
  );

  if (tasksWithProjects === undefined) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              viewFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => {
              haptics.light();
              setViewFilter(filter.id);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                viewFilter === filter.id && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task list */}
      {tasksWithProjects.length === 0 ? (
        <EmptyState
          icon={
            <CheckSquare size={56} color={colors.border} strokeWidth={1.5} />
          }
          title={
            viewFilter === "completed"
              ? "No completed tasks"
              : viewFilter === "today"
                ? "No tasks for today"
                : viewFilter === "important"
                  ? "No important tasks"
                  : "No tasks yet"
          }
          subtitle={
            viewFilter === "all"
              ? "Create a task to get started"
              : "Tasks matching this filter will appear here"
          }
        />
      ) : (
        <FlashList
          data={tasksWithProjects}
          renderItem={renderTask}
          keyExtractor={(item) => item._id}
          // @ts-ignore - FlashList estimatedItemSize prop
          estimatedItemSize={80}
          contentContainerStyle={styles.list}
        />
      )}

      <FAB onPress={() => formRef.current?.present()} />

      <TaskForm ref={formRef} mode="create" onSave={handleCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
  },
  list: {
    paddingVertical: spacing.sm,
  },
});
