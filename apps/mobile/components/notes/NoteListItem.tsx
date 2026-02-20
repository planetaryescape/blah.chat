import { Pin } from "lucide-react-native";
import { Text, View } from "react-native";
import removeMarkdown from "remove-markdown";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import type { Doc } from "@/lib/convex";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";
import { getTimeAgo } from "@/lib/utils/time";

type Note = Doc<"notes">;

interface NoteListItemProps {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
}

function getPreview(content: string, maxLength = 100): string {
  const plain = removeMarkdown(content);
  const lines = plain.split("\n").filter((line) => line.trim());
  // Skip first line (usually title)
  const previewLines = lines.slice(1).join(" ");
  if (previewLines.length <= maxLength) return previewLines;
  return `${previewLines.slice(0, maxLength).trim()}...`;
}

export function NoteListItem({
  note,
  onPress,
  onLongPress,
}: NoteListItemProps) {
  const preview = getPreview(note.content);
  const tags = Array.isArray(note.tags)
    ? (note.tags as string[])
    : ([] as string[]);
  const hasPreview = preview.length > 0;
  const hasTags = tags.length > 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: layout.radius.md,
        marginHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        backgroundColor: palette.glassLow,
        borderWidth: 1,
        borderColor: palette.glassBorder,
      }}
    >
      {/* Header: Title + Time + Pin */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          marginBottom: hasPreview || hasTags ? spacing.xs : 0,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.bodySemiBold,
            fontSize: 15,
            color: palette.starlight,
          }}
        >
          {note.title}
        </Text>

        <Text
          style={{
            fontFamily: typography.body,
            fontSize: 12,
            color: palette.starlightDim,
          }}
        >
          {getTimeAgo(note.updatedAt)}
        </Text>

        {note.isPinned && (
          <Pin
            size={14}
            color={palette.roseQuartz}
            fill={palette.roseQuartz}
            style={{ marginLeft: -spacing.xs }}
          />
        )}
      </View>

      {/* Preview */}
      {hasPreview && (
        <Text
          numberOfLines={2}
          style={{
            fontFamily: typography.body,
            fontSize: 13,
            color: palette.starlightDim,
            lineHeight: 18,
            marginBottom: hasTags ? spacing.xs : 0,
          }}
        >
          {preview}
        </Text>
      )}

      {/* Tags */}
      {hasTags && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.xs,
          }}
        >
          {tags.slice(0, 4).map((tag) => (
            <View
              key={tag}
              style={{
                paddingHorizontal: spacing.xs,
                paddingVertical: 2,
                backgroundColor: palette.glassMedium,
                borderRadius: layout.radius.xs,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 11,
                  color: palette.starlightDim,
                }}
              >
                #{tag}
              </Text>
            </View>
          ))}
          {tags.length > 4 && (
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 11,
                color: palette.starlightDim,
                alignSelf: "center",
              }}
            >
              +{tags.length - 4}
            </Text>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}
