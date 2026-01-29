import { FileText, Plus } from "lucide-react-native";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface EmptyNotesProps {
  isFiltered?: boolean;
  isSearching?: boolean;
  onCreateNote?: () => void;
}

export function EmptyNotes({
  isFiltered,
  isSearching,
  onCreateNote,
}: EmptyNotesProps) {
  const handleCreate = () => {
    haptic.medium();
    onCreateNote?.();
  };

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xl,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: palette.glassMedium,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.md,
        }}
      >
        <FileText size={32} color={palette.starlightDim} strokeWidth={1.5} />
      </View>

      <Text
        style={{
          fontFamily: typography.heading,
          fontSize: 18,
          color: palette.starlight,
          textAlign: "center",
          marginBottom: spacing.xs,
        }}
      >
        {isSearching
          ? "No notes found"
          : isFiltered
            ? "No notes in this project"
            : "No notes yet"}
      </Text>

      <Text
        style={{
          fontFamily: typography.body,
          fontSize: 14,
          color: palette.starlightDim,
          textAlign: "center",
          marginBottom: spacing.lg,
        }}
      >
        {isSearching
          ? "Try a different search term"
          : isFiltered
            ? "Notes you create or move to this project will appear here"
            : "Capture thoughts, save chat snippets, and organize your ideas"}
      </Text>

      {!isSearching && onCreateNote && (
        <AnimatedPressable
          onPress={handleCreate}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: palette.roseQuartz,
            borderRadius: layout.radius.md,
            gap: spacing.xs,
          }}
        >
          <Plus size={18} color={palette.void} />
          <Text
            style={{
              fontFamily: typography.bodySemiBold,
              fontSize: 14,
              color: palette.void,
            }}
          >
            Create your first note
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}
