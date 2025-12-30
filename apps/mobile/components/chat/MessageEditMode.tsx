import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface MessageEditModeProps {
  messageId: Id<"messages">;
  initialContent: string;
  onCancel: () => void;
  onSaved: () => void;
}

export function MessageEditMode({
  messageId,
  initialContent,
  onCancel,
  onSaved,
}: MessageEditModeProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const editMessage = useMutation(api.chat.editMessage);

  const isValid = content.trim().length > 0;
  const hasChanges = content.trim() !== initialContent.trim();

  const handleSave = useCallback(async () => {
    if (!isValid || !hasChanges || isSaving) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await (
        editMessage as (args: {
          messageId: Id<"messages">;
          content: string;
        }) => Promise<void>
      )({
        messageId,
        content: content.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } catch (error) {
      console.error("Failed to edit message:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }, [messageId, content, isValid, hasChanges, isSaving, editMessage, onSaved]);

  const handleCancel = useCallback(() => {
    Haptics.selectionAsync();
    onCancel();
  }, [onCancel]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="Edit your message..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        textAlignVertical="top"
        autoFocus
      />
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <X size={16} color={colors.foreground} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isValid || !hasChanges || isSaving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!isValid || !hasChanges || isSaving}
          activeOpacity={0.8}
        >
          <Check size={16} color={colors.primaryForeground} />
          <Text style={styles.saveText}>{isSaving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Editing will regenerate all AI responses after this message
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 22,
    minHeight: 80,
    maxHeight: 200,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  cancelText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.primaryForeground,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
