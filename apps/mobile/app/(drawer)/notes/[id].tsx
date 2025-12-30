import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pin, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

// Explicit type to avoid Convex type depth issues
interface Note {
  _id: string;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
}

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = id as Id<"notes">;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const note = useQuery(api.notes.getNote, { noteId }) as
    | Note
    | null
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const updateNote = useMutation(api.notes.updateNote);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteNote = useMutation(api.notes.deleteNote);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const togglePin = useMutation(api.notes.togglePin);

  const handleStartEdit = useCallback(() => {
    if (note) {
      setEditTitle(note.title ?? "");
      setEditContent(note.content ?? "");
      setIsEditing(true);
    }
  }, [note]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditTitle("");
    setEditContent("");
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving || !editContent.trim()) return;

    setIsSaving(true);
    try {
      await (
        updateNote as (args: {
          noteId: Id<"notes">;
          title?: string;
          content?: string;
        }) => Promise<void>
      )({
        noteId,
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, editTitle, editContent, isSaving, updateNote]);

  const handleTogglePin = useCallback(async () => {
    await (togglePin as (args: { noteId: Id<"notes"> }) => Promise<void>)({
      noteId,
    });
  }, [noteId, togglePin]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await (
            deleteNote as (args: { noteId: Id<"notes"> }) => Promise<void>
          )({ noteId });
          router.back();
        },
      },
    ]);
  }, [noteId, deleteNote, router]);

  if (note === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </>
    );
  }

  if (note === null) {
    return (
      <>
        <Stack.Screen options={{ title: "Not Found" }} />
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Note not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: note.title || "Note",
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleTogglePin}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Pin
                  size={20}
                  color={
                    note.isPinned ? colors.primary : colors.mutedForeground
                  }
                  fill={note.isPinned ? colors.primary : "transparent"}
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
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Note title"
              placeholderTextColor={colors.mutedForeground}
            />
            <TextInput
              style={styles.contentInput}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="Write your note..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />
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
                  (!editContent.trim() || isSaving) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!editContent.trim() || isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {note.title && <Text style={styles.title}>{note.title}</Text>}

            {note.tags && note.tags.length > 0 && (
              <View style={styles.tags}>
                {note.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={handleStartEdit} activeOpacity={0.8}>
              <View style={styles.markdownContainer}>
                <Markdown style={markdownStyles}>
                  {note.content || "No content"}
                </Markdown>
              </View>
            </TouchableOpacity>

            <Text style={styles.hint}>Tap content to edit</Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

const markdownStyles = {
  body: {
    color: colors.foreground,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  heading2: {
    fontFamily: fonts.headingMedium,
    fontSize: 20,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  heading3: {
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  paragraph: {
    marginBottom: spacing.md,
  },
  code_inline: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    fontFamily: fonts.body,
  },
  code_block: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    marginLeft: 0,
    fontStyle: "italic",
  },
  list_item: {
    marginBottom: spacing.xs,
  },
};

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
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.foreground,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  markdownContainer: {
    minHeight: 200,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  titleInput: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  contentInput: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 300,
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
