import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { FileText, FolderOpen } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { useCreateNote } from "@/lib/hooks/useNotes";
import { useProjects } from "@/lib/hooks/useProjects";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;
type Project = Doc<"projects">;

interface SaveAsNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

function extractInitialTitle(content: string): string {
  const firstLine = content.split("\n")[0] || "";
  const cleaned = firstLine.replace(/^#+\s*/, "").trim();
  return cleaned.slice(0, 100) || "Note from message";
}

export function SaveAsNoteSheet({
  isOpen,
  onClose,
  message,
}: SaveAsNoteSheetProps) {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] =
    useState<Id<"projects"> | null>(null);

  const createNote = useCreateNote();
  const projects = useProjects();

  // Control modal via ref
  useEffect(() => {
    if (isOpen && message) {
      setTitle(extractInitialTitle(message.content || ""));
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen, message]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setTitle("");
        setSelectedProjectId(null);
        onClose();
      }
    },
    [onClose],
  );

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

  const handleSave = useCallback(async () => {
    if (!message) return;

    haptic.medium();
    const noteId = await createNote({
      content: message.content || "",
      title: title.trim() || undefined,
      sourceMessageId: message._id,
      sourceConversationId: message.conversationId,
      projectId: selectedProjectId || undefined,
    });
    setTitle("");
    setSelectedProjectId(null);
    onClose();
    router.push(`/(drawer)/notes/${noteId}`);
  }, [message, title, selectedProjectId, createNote, onClose, router]);

  if (!message) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onChange={handleSheetChange}
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: spacing.lg,
            marginTop: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <FileText size={24} color={palette.indigo} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 20,
              color: palette.starlight,
            }}
          >
            Save as Note
          </Text>
        </View>

        {/* Title Input */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 14,
              color: palette.starlightDim,
              marginBottom: spacing.xs,
            }}
          >
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title..."
            placeholderTextColor={palette.starlightDim}
            style={{
              fontFamily: typography.body,
              fontSize: 15,
              color: palette.starlight,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.md,
              padding: spacing.md,
            }}
          />
        </View>

        {/* Project Picker */}
        <View style={{ marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              marginBottom: spacing.xs,
            }}
          >
            <FolderOpen size={16} color={palette.starlightDim} />
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 14,
                color: palette.starlightDim,
              }}
            >
              Project (optional)
            </Text>
          </View>
          <ScrollView
            style={{
              maxHeight: 150,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.md,
            }}
            contentContainerStyle={{ padding: spacing.xs }}
          >
            <AnimatedPressable
              onPress={() => {
                haptic.light();
                setSelectedProjectId(null);
              }}
              style={{
                padding: spacing.sm,
                borderRadius: layout.radius.sm,
                backgroundColor:
                  selectedProjectId === null
                    ? palette.glassMedium
                    : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 14,
                  color:
                    selectedProjectId === null
                      ? palette.starlight
                      : palette.starlightDim,
                }}
              >
                No project
              </Text>
            </AnimatedPressable>
            {(projects as Project[] | undefined)?.map((project) => (
              <AnimatedPressable
                key={project._id}
                onPress={() => {
                  haptic.light();
                  // @ts-expect-error - Type depth issues with Convex types (85+ modules)
                  setSelectedProjectId(project._id);
                }}
                style={{
                  padding: spacing.sm,
                  borderRadius: layout.radius.sm,
                  backgroundColor:
                    selectedProjectId === project._id
                      ? palette.glassMedium
                      : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.body,
                    fontSize: 14,
                    color:
                      selectedProjectId === project._id
                        ? palette.starlight
                        : palette.starlightDim,
                  }}
                >
                  {project.name}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            gap: spacing.md,
          }}
        >
          <AnimatedPressable
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.glassLow,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlightDim,
              }}
            >
              Cancel
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleSave}
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: layout.radius.md,
              backgroundColor: palette.indigo,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.void,
              }}
            >
              Save Note
            </Text>
          </AnimatedPressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
