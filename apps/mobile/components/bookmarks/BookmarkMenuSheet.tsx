import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { MessagesSquare, Trash2 } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Alert, Text } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { renderStandardBackdrop } from "@/lib/utils/bottomSheet";

interface BookmarkMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookmark: { conversationTitle?: string } | null;
  onGoToChat: () => void;
  onRemove: () => void;
}

export function BookmarkMenuSheet({
  isOpen,
  onClose,
  bookmark,
  onGoToChat,
  onRemove,
}: BookmarkMenuSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleGoToChat = useCallback(() => {
    haptic.medium();
    onGoToChat();
    bottomSheetRef.current?.close();
  }, [onGoToChat]);

  const handleRemove = useCallback(() => {
    Alert.alert(
      "Remove Bookmark",
      "Are you sure you want to remove this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            haptic.medium();
            onRemove();
            bottomSheetRef.current?.close();
          },
        },
      ],
    );
  }, [onRemove]);

  if (!isOpen || !bookmark) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderStandardBackdrop}
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
          {bookmark.conversationTitle || "Bookmarked Message"}
        </Text>

        {/* Go to Chat */}
        <AnimatedPressable
          onPress={handleGoToChat}
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
          <MessagesSquare size={20} color={palette.roseQuartz} />
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 15,
              color: palette.starlight,
            }}
          >
            Go to Chat
          </Text>
        </AnimatedPressable>

        {/* Remove Bookmark */}
        <AnimatedPressable
          onPress={handleRemove}
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
            Remove Bookmark
          </Text>
        </AnimatedPressable>
      </BottomSheetView>
    </BottomSheet>
  );
}
