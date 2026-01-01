import { Trash2 } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

interface FileData {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
}

interface ProjectFileCardProps {
  file: FileData;
  onDelete: () => void;
  onPress?: () => void;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase();
  }
  return "FILE";
}

function getFileTypeColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) {
    return "#10b981"; // green
  }
  if (mimeType.startsWith("video/")) {
    return "#8b5cf6"; // purple
  }
  if (mimeType.startsWith("audio/")) {
    return "#f59e0b"; // amber
  }
  if (mimeType === "application/pdf") {
    return "#ef4444"; // red
  }
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType === "application/rtf"
  ) {
    return "#3b82f6"; // blue
  }
  if (mimeType.includes("sheet") || mimeType.includes("excel")) {
    return "#22c55e"; // green
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return "#f97316"; // orange
  }
  if (mimeType.startsWith("text/")) {
    return "#6b7280"; // gray
  }
  return colors.mutedForeground;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ProjectFileCard({
  file,
  onDelete,
  onPress,
}: ProjectFileCardProps) {
  const ext = getFileExtension(file.name);
  const color = getFileTypeColor(file.mimeType);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.extText, { color }]}>
          {ext.length > 4 ? ext.slice(0, 4) : ext}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.size}>{formatFileSize(file.size)}</Text>
      </View>

      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteButton}
      >
        <Trash2 size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  extText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 11,
    textTransform: "uppercase",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  size: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  deleteButton: {
    padding: spacing.xs,
  },
});
