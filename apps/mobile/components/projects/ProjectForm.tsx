import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface Project {
  name: string;
  description?: string;
  systemPrompt?: string;
}

interface ProjectFormProps {
  mode: "create" | "edit";
  project?: Project;
  onSave: (data: {
    name: string;
    description?: string;
    systemPrompt?: string;
  }) => Promise<void>;
}

export const ProjectForm = forwardRef<BottomSheetModal, ProjectFormProps>(
  ({ mode, project, onSave }, ref) => {
    const snapPoints = useMemo(() => ["85%"], []);
    const [name, setName] = useState(project?.name ?? "");
    const [description, setDescription] = useState(project?.description ?? "");
    const [systemPrompt, setSystemPrompt] = useState(
      project?.systemPrompt ?? "",
    );
    const [isSaving, setIsSaving] = useState(false);

    const isValid = name.trim().length > 0;

    const handleSave = useCallback(async () => {
      if (!isValid || isSaving) return;

      setIsSaving(true);
      try {
        await onSave({
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
        });
        // @ts-ignore - ref type forwarding
        ref?.current?.dismiss();
        if (mode === "create") {
          setName("");
          setDescription("");
          setSystemPrompt("");
        }
      } finally {
        setIsSaving(false);
      }
    }, [name, description, systemPrompt, isValid, isSaving, onSave, ref, mode]);

    const handleDismiss = useCallback(() => {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setSystemPrompt(project?.systemPrompt ?? "");
    }, [project]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        onDismiss={handleDismiss}
      >
        <BottomSheetView style={styles.content}>
          <Text style={styles.heading}>
            {mode === "create" ? "New Project" : "Edit Project"}
          </Text>

          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <BottomSheetTextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Project name"
                placeholderTextColor={colors.mutedForeground}
                maxLength={100}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <BottomSheetTextInput
                style={[styles.input, styles.descriptionInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>System Prompt</Text>
              <BottomSheetTextInput
                style={[styles.input, styles.promptInput]}
                value={systemPrompt}
                onChangeText={setSystemPrompt}
                placeholder="Custom instructions for AI..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </View>

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
                    ? "Create Project"
                    : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ProjectForm.displayName = "ProjectForm";

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
    minHeight: 80,
    paddingTop: spacing.sm + 2,
  },
  promptInput: {
    minHeight: 120,
    paddingTop: spacing.sm + 2,
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
