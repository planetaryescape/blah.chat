import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar, ChevronRight, FolderOpen, X } from "lucide-react-native";
import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { ProjectPicker } from "./ProjectPicker";

type Urgency = "low" | "medium" | "high" | "urgent";

interface TaskFormData {
  title: string;
  description?: string;
  deadline?: number;
  urgency?: Urgency;
  projectId?: string;
}

interface TaskFormProps {
  mode: "create" | "edit";
  initialData?: {
    title?: string;
    description?: string;
    deadline?: number;
    urgency?: Urgency;
    projectId?: string;
    projectName?: string;
  };
  onSave: (data: TaskFormData) => Promise<void>;
}

const URGENCY_OPTIONS: { value: Urgency; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const TaskForm = forwardRef<BottomSheetModal, TaskFormProps>(
  ({ mode, initialData, onSave }, ref) => {
    const snapPoints = useMemo(() => ["85%"], []);
    const projectPickerRef = useRef<BottomSheetModal>(null);

    const [title, setTitle] = useState(initialData?.title ?? "");
    const [description, setDescription] = useState(
      initialData?.description ?? "",
    );
    const [deadline, setDeadline] = useState<Date | undefined>(
      initialData?.deadline ? new Date(initialData.deadline) : undefined,
    );
    const [urgency, setUrgency] = useState<Urgency | undefined>(
      initialData?.urgency,
    );
    const [projectId, setProjectId] = useState<string | undefined>(
      initialData?.projectId,
    );
    const [projectName, setProjectName] = useState<string | undefined>(
      initialData?.projectName,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isValid = title.trim().length > 0;

    const handleSave = useCallback(async () => {
      if (!isValid || isSaving) return;

      setIsSaving(true);
      try {
        await onSave({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline?.getTime(),
          urgency,
          projectId,
        });
        // @ts-ignore - ref type forwarding
        ref?.current?.dismiss();
        // Reset form after successful create
        if (mode === "create") {
          setTitle("");
          setDescription("");
          setDeadline(undefined);
          setUrgency(undefined);
          setProjectId(undefined);
          setProjectName(undefined);
        }
      } finally {
        setIsSaving(false);
      }
    }, [
      title,
      description,
      deadline,
      urgency,
      projectId,
      isValid,
      isSaving,
      onSave,
      ref,
      mode,
    ]);

    const handleDismiss = useCallback(() => {
      // Reset to initial values on dismiss
      setTitle(initialData?.title ?? "");
      setDescription(initialData?.description ?? "");
      setDeadline(
        initialData?.deadline ? new Date(initialData.deadline) : undefined,
      );
      setUrgency(initialData?.urgency);
      setProjectId(initialData?.projectId);
      setProjectName(initialData?.projectName);
    }, [initialData]);

    const handleDateChange = useCallback(
      (_event: unknown, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
          // Set to end of day
          selectedDate.setHours(23, 59, 59, 999);
          setDeadline(selectedDate);
        }
      },
      [],
    );

    const handleProjectSelect = useCallback(
      (id: string | undefined, name?: string) => {
        setProjectId(id);
        setProjectName(name);
      },
      [],
    );

    const formatDeadline = (date: Date): string => {
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    };

    return (
      <>
        <BottomSheetModal
          ref={ref}
          snapPoints={snapPoints}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
          onDismiss={handleDismiss}
        >
          <BottomSheetView style={styles.content}>
            <Text style={styles.heading}>
              {mode === "create" ? "New Task" : "Edit Task"}
            </Text>

            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Title */}
              <View style={styles.field}>
                <Text style={styles.label}>Title *</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What needs to be done?"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={500}
                />
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <BottomSheetTextInput
                  style={[styles.input, styles.descriptionInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add details..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Deadline */}
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
                      !deadline && styles.pickerButtonPlaceholder,
                    ]}
                  >
                    {deadline ? formatDeadline(deadline) : "Set deadline"}
                  </Text>
                  {deadline && (
                    <TouchableOpacity
                      onPress={() => setDeadline(undefined)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {/* Urgency */}
              <View style={styles.field}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.urgencyButtons}>
                  {URGENCY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.urgencyButton,
                        urgency === option.value && styles.urgencyButtonActive,
                      ]}
                      onPress={() =>
                        setUrgency(
                          urgency === option.value ? undefined : option.value,
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.urgencyButtonText,
                          urgency === option.value &&
                            styles.urgencyButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Project */}
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
                      !projectName && styles.pickerButtonPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {projectName || "Select project"}
                  </Text>
                  {projectId ? (
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

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!isValid || isSaving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!isValid || isSaving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Task"
                      : "Save Changes"}
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomPadding} />
            </BottomSheetScrollView>
          </BottomSheetView>
        </BottomSheetModal>

        <ProjectPicker
          ref={projectPickerRef}
          selectedProjectId={projectId}
          onSelect={handleProjectSelect}
        />
      </>
    );
  },
);

TaskForm.displayName = "TaskForm";

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.foreground,
    marginBottom: spacing.lg,
  },
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
