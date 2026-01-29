import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FolderOpen,
  MessageSquare,
  MoreVertical,
  Pin,
  PinOff,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { NoteShareSheet, TagInput } from "@/components/notes";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import {
  useAcceptNoteTag,
  useAddNoteTag,
  useDeleteNote,
  useNote,
  useProjects,
  useRemoveNoteTag,
  useToggleNotePin,
  useTriggerAutoTag,
  useUpdateNote,
} from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

const AUTOSAVE_DELAY = 2000;

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const noteId = id as Id<"notes">;

  const note = useNote(noteId);
  const projects = useProjects();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useToggleNotePin();
  const addTag = useAddNoteTag();
  const removeTag = useRemoveNoteTag();
  const acceptTag = useAcceptNoteTag();
  const triggerAutoTag = useTriggerAutoTag();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedRef = useRef(false);
  const menuSheetRef = useRef<BottomSheetModal>(null);
  const projectSheetRef = useRef<BottomSheetModal>(null);

  // Initialize content when note loads
  useEffect(() => {
    if (note && !hasInitializedRef.current) {
      setTitle(note.title);
      setContent(note.content || "");
      hasInitializedRef.current = true;
    }
  }, [note]);

  // Control menu sheet via ref
  useEffect(() => {
    if (isMenuOpen) {
      menuSheetRef.current?.present();
    } else {
      menuSheetRef.current?.dismiss();
    }
  }, [isMenuOpen]);

  // Control project picker sheet via ref
  useEffect(() => {
    if (isProjectPickerOpen) {
      projectSheetRef.current?.present();
    } else {
      projectSheetRef.current?.dismiss();
    }
  }, [isProjectPickerOpen]);

  // Auto-save debounce for content
  const scheduleAutosave = useCallback(
    (newContent: string) => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(async () => {
        if (!note) return;

        setIsSaving(true);
        try {
          await updateNote({
            noteId: note._id,
            content: newContent,
          });
        } finally {
          setIsSaving(false);
        }
      }, AUTOSAVE_DELAY);
    },
    [note, updateNote],
  );

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text);
      if (hasInitializedRef.current) {
        scheduleAutosave(text);
      }
    },
    [scheduleAutosave],
  );

  // Save title changes
  const handleTitleBlur = useCallback(async () => {
    if (!note || title === note.title) return;

    try {
      await updateNote({
        noteId: note._id,
        title: title || "Untitled Note",
      });
    } catch {
      haptic.error();
    }
  }, [note, title, updateNote]);

  const handleBack = useCallback(() => {
    haptic.light();
    // Save any pending changes before navigating
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    if (note && content !== note.content) {
      updateNote({
        noteId: note._id,
        content,
      });
    }
    router.back();
  }, [router, content, note, updateNote]);

  const handleTogglePin = useCallback(async () => {
    if (!note) return;
    haptic.medium();
    try {
      await togglePin({ noteId: note._id });
    } catch {
      haptic.error();
    }
  }, [note, togglePin]);

  const handleDelete = useCallback(() => {
    if (!note) return;

    Alert.alert(
      "Delete Note",
      `Are you sure you want to delete "${note.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            haptic.medium();
            try {
              await deleteNote({ noteId: note._id });
              router.back();
            } catch {
              haptic.error();
            }
          },
        },
      ],
    );
  }, [note, deleteNote, router]);

  const handleSelectProject = useCallback(
    async (projectId: Id<"projects"> | undefined) => {
      if (!note) return;
      haptic.light();
      try {
        await updateNote({
          noteId: note._id,
          projectId,
        });
      } catch {
        haptic.error();
      }
      setIsProjectPickerOpen(false);
    },
    [note, updateNote],
  );

  const handleAddTag = useCallback(
    async (tag: string) => {
      if (!note) return;
      try {
        await addTag({ noteId: note._id, tag });
      } catch {
        haptic.error();
      }
    },
    [note, addTag],
  );

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!note) return;
      try {
        await removeTag({ noteId: note._id, tag });
      } catch {
        haptic.error();
      }
    },
    [note, removeTag],
  );

  const handleAcceptTag = useCallback(
    async (tag: string) => {
      if (!note) return;
      try {
        await acceptTag({ noteId: note._id, tag });
      } catch {
        haptic.error();
      }
    },
    [note, acceptTag],
  );

  const handleAutoTag = useCallback(async () => {
    if (!note || !note.content || note.content.length < 50) return;

    setIsAutoTagging(true);
    haptic.medium();
    setIsMenuOpen(false);

    try {
      const result = await triggerAutoTag({ noteId: note._id });
      if (result?.appliedTags?.length) {
        Alert.alert("Tags Added", `Added ${result.appliedTags.length} tag(s)`);
      } else {
        Alert.alert("No Tags", "Could not generate tags for this note");
      }
    } catch {
      haptic.error();
      Alert.alert("Error", "Failed to generate tags");
    } finally {
      setIsAutoTagging(false);
    }
  }, [note, triggerAutoTag]);

  const handleOpenSourceChat = useCallback(() => {
    if (!note?.sourceConversationId) return;
    haptic.light();
    router.push(`/chat/${note.sourceConversationId}`);
  }, [note?.sourceConversationId, router]);

  const handleTogglePreview = useCallback(() => {
    haptic.light();
    Keyboard.dismiss();
    setIsPreviewMode((prev) => !prev);
  }, []);

  const selectedProject = projects?.find((p) => p._id === note?.projectId);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  if (!note) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: palette.void,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={palette.roseQuartz} />
      </SafeAreaView>
    );
  }

  const canAutoTag = note.content && note.content.length >= 50;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: palette.glassBorder,
            height: layout.headerHeight,
            gap: spacing.sm,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={palette.starlight} />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Saving indicator */}
          {isSaving && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <ActivityIndicator size="small" color={palette.starlightDim} />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 12,
                  color: palette.starlightDim,
                }}
              >
                Saving...
              </Text>
            </View>
          )}

          {/* Auto-tagging indicator */}
          {isAutoTagging && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
              }}
            >
              <ActivityIndicator size="small" color={palette.roseQuartz} />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 12,
                  color: palette.roseQuartz,
                }}
              >
                Generating tags...
              </Text>
            </View>
          )}

          {/* Preview toggle button */}
          <TouchableOpacity
            onPress={handleTogglePreview}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isPreviewMode ? (
              <EyeOff size={20} color={palette.roseQuartz} />
            ) : (
              <Eye size={20} color={palette.starlightDim} />
            )}
          </TouchableOpacity>

          {/* Pin button */}
          <TouchableOpacity
            onPress={() => {
              haptic.light();
              handleTogglePin();
            }}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {note.isPinned ? (
              <Pin
                size={20}
                color={palette.roseQuartz}
                fill={palette.roseQuartz}
              />
            ) : (
              <Pin size={20} color={palette.starlightDim} />
            )}
          </TouchableOpacity>

          {/* Menu button - uses TouchableOpacity from RNGH for drawer gesture compatibility */}
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              haptic.light();
              setIsMenuOpen(true);
            }}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MoreVertical size={20} color={palette.starlight} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            onBlur={handleTitleBlur}
            placeholder="Note title"
            placeholderTextColor={palette.starlightDim}
            editable={!isPreviewMode}
            style={{
              fontFamily: typography.heading,
              fontSize: 24,
              color: palette.starlight,
              paddingVertical: spacing.md,
            }}
          />

          {/* Project selector - uses TouchableOpacity from RNGH for drawer gesture compatibility */}
          <TouchableOpacity
            onPress={() => {
              Keyboard.dismiss();
              haptic.light();
              setIsProjectPickerOpen(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: spacing.xs,
              marginBottom: spacing.sm,
              gap: spacing.xs,
            }}
          >
            <FolderOpen size={16} color={palette.starlightDim} />
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: selectedProject
                  ? palette.starlight
                  : palette.starlightDim,
              }}
            >
              {selectedProject?.name || "No project"}
            </Text>
            <ChevronDown size={14} color={palette.starlightDim} />
          </TouchableOpacity>

          {/* Source Chat Link */}
          {note.sourceConversationId && (
            <TouchableOpacity
              onPress={handleOpenSourceChat}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: spacing.xs,
                marginBottom: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <MessageSquare size={16} color={palette.starlightDim} />
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 13,
                  color: palette.roseQuartz,
                }}
              >
                Linked Chat
              </Text>
              <ArrowUpRight size={14} color={palette.roseQuartz} />
            </TouchableOpacity>
          )}

          {/* Tags */}
          <View style={{ marginBottom: spacing.md }}>
            <TagInput
              tags={note.tags || []}
              suggestedTags={note.suggestedTags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onAcceptSuggested={handleAcceptTag}
            />
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: palette.glassBorder,
              marginBottom: spacing.sm,
            }}
          />

          {/* Content: Editor or Preview */}
          {isPreviewMode ? (
            <View style={{ paddingBottom: spacing.xxl, minHeight: 300 }}>
              {content ? (
                <MarkdownContent content={content} />
              ) : (
                <Text
                  style={{
                    fontFamily: typography.body,
                    fontSize: 16,
                    color: palette.starlightDim,
                    fontStyle: "italic",
                  }}
                >
                  No content to preview
                </Text>
              )}
            </View>
          ) : (
            <TextInput
              value={content}
              onChangeText={handleContentChange}
              placeholder="Start writing..."
              placeholderTextColor={palette.starlightDim}
              multiline
              textAlignVertical="top"
              style={{
                fontFamily: typography.body,
                fontSize: 16,
                color: palette.starlight,
                lineHeight: 24,
                minHeight: 300,
                paddingBottom: spacing.xxl,
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Menu Sheet */}
      <BottomSheetModal
        ref={menuSheetRef}
        onChange={(index) => {
          if (index === -1) setIsMenuOpen(false);
        }}
        enablePanDownToClose
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: palette.nebula,
          borderTopLeftRadius: layout.radius.xl,
          borderTopRightRadius: layout.radius.xl,
        }}
        handleIndicatorStyle={{
          backgroundColor: palette.starlightDim,
          width: 40,
        }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.xxl,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.heading,
              fontSize: 18,
              color: palette.starlight,
              marginBottom: spacing.md,
              marginTop: spacing.sm,
            }}
          >
            {note.title}
          </Text>

          {/* Pin/Unpin */}
          <AnimatedPressable
            onPress={() => {
              handleTogglePin();
              setIsMenuOpen(false);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.glassLow,
              marginBottom: spacing.sm,
              gap: spacing.sm,
            }}
          >
            {note.isPinned ? (
              <PinOff size={20} color={palette.starlightDim} />
            ) : (
              <Pin size={20} color={palette.roseQuartz} />
            )}
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              {note.isPinned ? "Unpin note" : "Pin note"}
            </Text>
          </AnimatedPressable>

          {/* Generate Tags */}
          <AnimatedPressable
            onPress={handleAutoTag}
            disabled={!canAutoTag || isAutoTagging}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.glassLow,
              marginBottom: spacing.sm,
              gap: spacing.sm,
              opacity: canAutoTag ? 1 : 0.5,
            }}
          >
            {isAutoTagging ? (
              <ActivityIndicator size={20} color={palette.roseQuartz} />
            ) : (
              <Sparkles size={20} color={palette.roseQuartz} />
            )}
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              Generate tags
            </Text>
          </AnimatedPressable>

          {/* Share Note */}
          <AnimatedPressable
            onPress={() => {
              setIsMenuOpen(false);
              setTimeout(() => setIsShareSheetOpen(true), 300);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.glassLow,
              marginBottom: spacing.sm,
              gap: spacing.sm,
            }}
          >
            <Share2 size={20} color={palette.roseQuartz} />
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              Share note
            </Text>
          </AnimatedPressable>

          {/* Delete */}
          <AnimatedPressable
            onPress={() => {
              setIsMenuOpen(false);
              setTimeout(handleDelete, 300);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.glassLow,
              gap: spacing.sm,
            }}
          >
            <Trash2 size={20} color={palette.error} />
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.error,
              }}
            >
              Delete note
            </Text>
          </AnimatedPressable>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Project Picker Sheet */}
      <BottomSheetModal
        ref={projectSheetRef}
        onChange={(index) => {
          if (index === -1) setIsProjectPickerOpen(false);
        }}
        enablePanDownToClose
        snapPoints={["50%", "75%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: palette.nebula,
          borderTopLeftRadius: layout.radius.xl,
          borderTopRightRadius: layout.radius.xl,
        }}
        handleIndicatorStyle={{
          backgroundColor: palette.starlightDim,
          width: 40,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.xxl,
          }}
        >
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 20,
              color: palette.starlight,
              marginBottom: spacing.lg,
              marginTop: spacing.sm,
            }}
          >
            Select Project
          </Text>

          {/* No Project */}
          <AnimatedPressable
            onPress={() => handleSelectProject(undefined)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: !note.projectId
                ? palette.glassMedium
                : palette.glassLow,
              marginBottom: spacing.xs,
              borderWidth: 1,
              borderColor: !note.projectId
                ? palette.roseQuartz
                : palette.glassBorder,
            }}
          >
            <FolderOpen
              size={20}
              color={
                !note.projectId ? palette.roseQuartz : palette.starlightDim
              }
              style={{ marginRight: spacing.sm }}
            />
            <Text
              style={{
                flex: 1,
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              No Project
            </Text>
            {!note.projectId && <Check size={20} color={palette.roseQuartz} />}
          </AnimatedPressable>

          {/* Projects */}
          {projects?.map((project) => {
            const isSelected = note.projectId === project._id;

            return (
              <AnimatedPressable
                key={project._id}
                onPress={() => handleSelectProject(project._id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: spacing.md,
                  borderRadius: layout.radius.md,
                  backgroundColor: isSelected
                    ? palette.glassMedium
                    : palette.glassLow,
                  marginBottom: spacing.xs,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? palette.roseQuartz
                    : palette.glassBorder,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.starlight,
                  }}
                >
                  {project.name}
                </Text>
                {isSelected && <Check size={20} color={palette.roseQuartz} />}
              </AnimatedPressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Share Sheet */}
      <NoteShareSheet
        isOpen={isShareSheetOpen}
        onClose={() => setIsShareSheetOpen(false)}
        note={note}
      />
    </SafeAreaView>
  );
}
