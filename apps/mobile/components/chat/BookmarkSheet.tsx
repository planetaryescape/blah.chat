import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Bookmark } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { useCreateBookmark } from "@/lib/hooks/useBookmarks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { TagInput } from "../notes/TagInput";

interface BookmarkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: Id<"messages"> | null;
}

export function BookmarkSheet({
  isOpen,
  onClose,
  messageId,
}: BookmarkSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const createBookmark = useCreateBookmark();

  // Control modal via ref
  useEffect(() => {
    if (isOpen && messageId) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen, messageId]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setNotes("");
        setTags([]);
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
    if (!messageId) return;

    haptic.medium();
    await createBookmark({
      messageId,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    setNotes("");
    setTags([]);
    onClose();
  }, [messageId, notes, tags, createBookmark, onClose]);

  const handleAddTag = useCallback((tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  }, []);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  if (!messageId) return null;

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
          <Bookmark size={24} color={palette.roseQuartz} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 20,
              color: palette.starlight,
            }}
          >
            Bookmark Message
          </Text>
        </View>

        {/* Notes Input */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 14,
              color: palette.starlightDim,
              marginBottom: spacing.xs,
            }}
          >
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note about this message..."
            placeholderTextColor={palette.starlightDim}
            multiline
            numberOfLines={3}
            style={{
              fontFamily: typography.body,
              fontSize: 15,
              color: palette.starlight,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.md,
              padding: spacing.md,
              minHeight: 80,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* Tags */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 14,
              color: palette.starlightDim,
              marginBottom: spacing.xs,
            }}
          >
            Tags (optional)
          </Text>
          <TagInput
            tags={tags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
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
              backgroundColor: palette.roseQuartz,
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
              Save
            </Text>
          </AnimatedPressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
