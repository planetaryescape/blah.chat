import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Globe,
  Loader2,
  Trash2,
  Type,
  Youtube,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { formatSize } from "@/lib/utils/fileUtils";

type KnowledgeSource = Doc<"knowledgeSources">;

interface KnowledgeCardProps {
  source: KnowledgeSource;
  onDelete: () => void;
  onRetry?: () => void;
}

const TYPE_CONFIG: Record<
  string,
  { icon: typeof FileText; color: string; label: string }
> = {
  file: { icon: FileText, color: colors.primary, label: "File" },
  text: { icon: Type, color: colors.success, label: "Text" },
  web: { icon: Globe, color: colors.link, label: "Web" },
  youtube: { icon: Youtube, color: "#f00", label: "YouTube" },
};

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  pending: { icon: Loader2, color: colors.mutedForeground, label: "Pending" },
  processing: { icon: Loader2, color: colors.primary, label: "Processing" },
  completed: { icon: CheckCircle, color: colors.success, label: "Ready" },
  failed: { icon: AlertCircle, color: colors.error, label: "Failed" },
};

export function KnowledgeCard({
  source,
  onDelete,
  onRetry,
}: KnowledgeCardProps) {
  const typeConfig = TYPE_CONFIG[source.type] || TYPE_CONFIG.file;
  const statusConfig = STATUS_CONFIG[source.status] || STATUS_CONFIG.pending;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDelete();
  };

  const handleRetry = () => {
    if (onRetry) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRetry();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${typeConfig.color}15` },
          ]}
        >
          <TypeIcon size={18} color={typeConfig.color} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {source.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.typeLabel}>{typeConfig.label}</Text>
            {source.size && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.size}>{formatSize(source.size)}</Text>
              </>
            )}
            {source.chunkCount && (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.chunks}>{source.chunkCount} chunks</Text>
              </>
            )}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          onPress={handleDelete}
        >
          <Trash2 size={16} color={colors.error} />
        </Pressable>
      </View>

      {source.description && (
        <Text style={styles.description} numberOfLines={2}>
          {source.description}
        </Text>
      )}

      {source.url && (
        <Text style={styles.url} numberOfLines={1}>
          {source.url}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          <StatusIcon size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {source.status === "failed" && source.error && (
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
            onPress={handleRetry}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}

        <View style={styles.spacer} />
        <Text style={styles.date}>{formatDate(source.createdAt)}</Text>
      </View>

      {source.status === "failed" && source.error && (
        <Text style={styles.error} numberOfLines={2}>
          {source.error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  typeLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  dot: {
    color: colors.mutedForeground,
  },
  size: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  chunks: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: `${colors.error}15`,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  url: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.link,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  retryText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.primary,
  },
  spacer: {
    flex: 1,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.error,
    marginTop: spacing.xs,
    backgroundColor: `${colors.error}10`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
});
