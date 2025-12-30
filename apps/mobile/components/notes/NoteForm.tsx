import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
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

// Explicit type to avoid Convex type depth issues
interface Note {
  title?: string;
  content?: string;
}

interface NoteFormProps {
  mode: "create" | "edit";
  note?: Doc<"notes">;
  onSave: (data: { title?: string; content: string }) => Promise<void>;
}

export const NoteForm = forwardRef<BottomSheetModal, NoteFormProps>(
  ({ mode, note: rawNote, onSave }, ref) => {
    const note = rawNote as unknown as Note | undefined;
    const snapPoints = useMemo(() => ["85%"], []);
    const [title, setTitle] = useState(note?.title ?? "");
    const [content, setContent] = useState(note?.content ?? "");
    const [isSaving, setIsSaving] = useState(false);

    const isValid = content.trim().length > 0;

    const handleSave = useCallback(async () => {
      if (!isValid || isSaving) return;

      setIsSaving(true);
      try {
        await onSave({
          title: title.trim() || undefined,
          content: content.trim(),
        });
        // @ts-ignore - ref type forwarding
        ref?.current?.dismiss();
        // Reset form after successful create
        if (mode === "create") {
          setTitle("");
          setContent("");
        }
      } finally {
        setIsSaving(false);
      }
    }, [title, content, isValid, isSaving, onSave, ref, mode]);

    const handleDismiss = useCallback(() => {
      // Reset to note values or empty on dismiss
      setTitle(note?.title ?? "");
      setContent(note?.content ?? "");
    }, [note]);

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
            {mode === "create" ? "New Note" : "Edit Note"}
          </Text>

          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.field}>
              <Text style={styles.label}>Title (optional)</Text>
              <BottomSheetTextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Note title"
                placeholderTextColor={colors.mutedForeground}
                maxLength={200}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Content *</Text>
              <BottomSheetTextInput
                style={[styles.input, styles.contentInput]}
                value={content}
                onChangeText={setContent}
                placeholder="Write your note..."
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
                    ? "Create Note"
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

NoteForm.displayName = "NoteForm";

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
  contentInput: {
    minHeight: 200,
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
