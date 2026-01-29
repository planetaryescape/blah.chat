import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Pin, PinOff, Trash2 } from "lucide-react-native";
import { useCallback, useMemo, useRef } from "react";
import { Alert, Text } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Note = Doc<"notes">;

interface NoteMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onTogglePin: () => void;
  onDelete: () => void;
}

export function NoteMenuSheet({
  isOpen,
  onClose,
  note,
  onTogglePin,
  onDelete,
}: NoteMenuSheetProps) {
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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleTogglePin = useCallback(() => {
    haptic.medium();
    onTogglePin();
    bottomSheetRef.current?.close();
  }, [onTogglePin]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Note",
      `Are you sure you want to delete "${note?.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            haptic.heavy();
            onDelete();
            bottomSheetRef.current?.close();
          },
        },
      ],
    );
  }, [note, onDelete]);

  if (!isOpen || !note) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
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
          onPress={handleTogglePin}
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

        {/* Delete */}
        <AnimatedPressable
          onPress={handleDelete}
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
    </BottomSheet>
  );
}
