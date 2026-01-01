import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  FolderOpen,
  Star,
  Sun,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ProjectPicker } from "@/components/tasks/ProjectPicker";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

// Explicit types to avoid Convex type depth issues
interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  deadline?: number;
  urgency?: "low" | "medium" | "high" | "urgent";
  projectId?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

interface Project {
  _id: string;
  name: string;
}

type Urgency = "low" | "medium" | "high" | "urgent";

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = id as Id<"tasks">;
  const router = useRouter();
  const projectPickerRef = useRef<BottomSheetModal>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState<Date | undefined>();
  const [editUrgency, setEditUrgency] = useState<Urgency | undefined>();
  const [editProjectId, setEditProjectId] = useState<string | undefined>();
  const [editProjectName, setEditProjectName] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const task = useQuery(api.tasks.get, { id: taskId }) as
    | Task
    | null
    | undefined;

  const project = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
    api.projects.get,
    task?.projectId ? { id: task.projectId as Id<"projects"> } : "skip",
  ) as Project | null | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const updateTask = useMutation(api.tasks.update);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const completeTask = useMutation(api.tasks.complete);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteTask = useMutation(api.tasks.deleteTask);

  const handleStartEdit = useCallback(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description ?? "");
      setEditDeadline(task.deadline ? new Date(task.deadline) : undefined);
      setEditUrgency(task.urgency);
      setEditProjectId(task.projectId);
      setEditProjectName(project?.name);
      setIsEditing(true);
    }
  }, [task, project]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving || !editTitle.trim()) return;

    setIsSaving(true);
    try {
      await (
        updateTask as (args: {
          id: Id<"tasks">;
          title?: string;
          description?: string;
          deadline?: number;
          urgency?: Urgency;
          projectId?: Id<"projects">;
        }) => Promise<void>
      )({
        id: taskId,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        deadline: editDeadline?.getTime(),
        urgency: editUrgency,
        projectId: editProjectId as Id<"projects"> | undefined,
      });
      haptics.success();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [
    taskId,
    editTitle,
    editDescription,
    editDeadline,
    editUrgency,
    editProjectId,
    isSaving,
    updateTask,
  ]);

  const handleToggleComplete = useCallback(async () => {
    if (!task) return;
    haptics.light();
    if (task.status === "completed") {
      await (
        updateTask as (args: {
          id: Id<"tasks">;
          status: string;
        }) => Promise<void>
      )({
        id: taskId,
        status: "in_progress",
      });
    } else {
      await (completeTask as (args: { id: Id<"tasks"> }) => Promise<void>)({
        id: taskId,
      });
    }
    haptics.success();
  }, [task, taskId, updateTask, completeTask]);

  const handleToggleUrgency = useCallback(async () => {
    if (!task) return;
    haptics.light();
    const isImportant = task.urgency === "urgent" || task.urgency === "high";
    await (
      updateTask as (args: {
        id: Id<"tasks">;
        urgency: string;
      }) => Promise<void>
    )({
      id: taskId,
      urgency: isImportant ? "low" : "urgent",
    });
    haptics.success();
  }, [task, taskId, updateTask]);

  const handleAddToMyDay = useCallback(async () => {
    haptics.light();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    await (
      updateTask as (args: {
        id: Id<"tasks">;
        deadline: number;
      }) => Promise<void>
    )({
      id: taskId,
      deadline: today.getTime(),
    });
    haptics.success();
  }, [taskId, updateTask]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          haptics.heavy();
          await (deleteTask as (args: { id: Id<"tasks"> }) => Promise<void>)({
            id: taskId,
          });
          haptics.success();
          router.back();
        },
      },
    ]);
  }, [taskId, deleteTask, router]);

  const handleDateChange = useCallback(
    (_event: unknown, selectedDate?: Date) => {
      setShowDatePicker(Platform.OS === "ios");
      if (selectedDate) {
        selectedDate.setHours(23, 59, 59, 999);
        setEditDeadline(selectedDate);
      }
    },
    [],
  );

  const handleProjectSelect = useCallback(
    (id: string | undefined, name?: string) => {
      setEditProjectId(id);
      setEditProjectName(name);
    },
    [],
  );

  if (task === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </>
    );
  }

  if (task === null) {
    return (
      <>
        <Stack.Screen options={{ title: "Not Found" }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Task not found</Text>
        </View>
      </>
    );
  }

  const isCompleted = task.status === "completed";
  const isImportant = task.urgency === "urgent" || task.urgency === "high";
  const isTodayTask = task.deadline && isToday(task.deadline);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Task",
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleToggleUrgency}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Star
                  size={20}
                  color={isImportant ? colors.star : colors.mutedForeground}
                  fill={isImportant ? colors.star : "transparent"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {isEditing ? (
          <>
            {/* Edit mode */}
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Task title"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Add details..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Deadline</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={18} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.pickerButtonText,
                    !editDeadline && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {editDeadline
                    ? editDeadline.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "Set deadline"}
                </Text>
                {editDeadline && (
                  <TouchableOpacity
                    onPress={() => setEditDeadline(undefined)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={editDeadline || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.urgencyButtons}>
                {URGENCY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.urgencyButton,
                      editUrgency === option.value &&
                        styles.urgencyButtonActive,
                    ]}
                    onPress={() =>
                      setEditUrgency(
                        editUrgency === option.value ? undefined : option.value,
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        editUrgency === option.value &&
                          styles.urgencyButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Project</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => projectPickerRef.current?.present()}
                activeOpacity={0.7}
              >
                <FolderOpen size={18} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.pickerButtonText,
                    !editProjectName && styles.pickerButtonPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {editProjectName || "Select project"}
                </Text>
                {editProjectId ? (
                  <TouchableOpacity
                    onPress={() => handleProjectSelect(undefined, undefined)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ) : (
                  <ChevronRight size={18} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!editTitle.trim() || isSaving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!editTitle.trim() || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* View mode */}
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={handleToggleComplete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isCompleted ? (
                  <CheckCircle
                    size={28}
                    color={colors.primary}
                    fill={colors.primary}
                  />
                ) : (
                  <View style={styles.checkbox} />
                )}
              </TouchableOpacity>
              <Text
                style={[styles.title, isCompleted && styles.titleCompleted]}
              >
                {task.title}
              </Text>
            </View>

            {/* Status badges */}
            <View style={styles.badges}>
              {isCompleted && (
                <View style={[styles.badge, styles.badgeCompleted]}>
                  <Text style={styles.badgeTextCompleted}>Completed</Text>
                </View>
              )}
              {isTodayTask && !isCompleted && (
                <View style={[styles.badge, styles.badgeToday]}>
                  <Sun size={14} color={colors.primary} />
                  <Text style={styles.badgeTextToday}>My Day</Text>
                </View>
              )}
              {isImportant && !isCompleted && (
                <View style={[styles.badge, styles.badgeImportant]}>
                  <Star size={14} color={colors.star} fill={colors.star} />
                  <Text style={styles.badgeTextImportant}>Important</Text>
                </View>
              )}
            </View>

            {/* Description */}
            {task.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
            )}

            {/* Deadline */}
            {task.deadline && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deadline</Text>
                <View style={styles.infoRow}>
                  <Calendar size={18} color={colors.mutedForeground} />
                  <Text style={styles.infoText}>
                    {formatDate(task.deadline)}
                  </Text>
                </View>
              </View>
            )}

            {/* Project */}
            {project && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Project</Text>
                <TouchableOpacity
                  style={styles.projectLink}
                  onPress={() =>
                    router.push(`/projects/${project._id}` as never)
                  }
                  activeOpacity={0.7}
                >
                  <FolderOpen size={18} color={colors.mutedForeground} />
                  <Text style={styles.projectLinkText}>{project.name}</Text>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}

            {/* Quick actions */}
            {!isCompleted && (
              <View style={styles.quickActions}>
                {!isTodayTask && (
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={handleAddToMyDay}
                    activeOpacity={0.7}
                  >
                    <Sun size={18} color={colors.primary} />
                    <Text style={styles.quickActionText}>Add to My Day</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={handleToggleComplete}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={18} color={colors.primary} />
                  <Text style={styles.quickActionText}>Mark Complete</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={handleStartEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit Task</Text>
            </TouchableOpacity>

            {/* Timestamps */}
            <View style={styles.timestamps}>
              <Text style={styles.timestampText}>
                Created {formatDate(task.createdAt)}
              </Text>
              <Text style={styles.timestampText}>
                Updated {formatDate(task.updatedAt)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <ProjectPicker
        ref={projectPickerRef}
        selectedProjectId={editProjectId}
        onSelect={handleProjectSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  title: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.foreground,
    lineHeight: 32,
  },
  titleCompleted: {
    textDecorationLine: "line-through",
    color: colors.mutedForeground,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeCompleted: {
    backgroundColor: `${colors.primary}20`,
  },
  badgeTextCompleted: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  badgeToday: {
    backgroundColor: `${colors.primary}20`,
  },
  badgeTextToday: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  badgeImportant: {
    backgroundColor: `${colors.star}20`,
  },
  badgeTextImportant: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.star,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
  },
  projectLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  projectLinkText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  editButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  editButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.foreground,
  },
  timestamps: {
    gap: spacing.xs,
  },
  timestampText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  // Edit mode styles
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
  },
  descriptionInput: {
    minHeight: 100,
    paddingTop: spacing.sm + 2,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  pickerButtonText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
  },
  pickerButtonPlaceholder: {
    color: colors.mutedForeground,
  },
  urgencyButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
  },
  urgencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  urgencyButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  urgencyButtonTextActive: {
    color: colors.primaryForeground,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.foreground,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
});
