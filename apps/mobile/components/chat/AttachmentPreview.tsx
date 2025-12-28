import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { X, FileText, Mic } from "lucide-react-native";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing, radius } from "@/lib/theme/spacing";
import { formatSize, getFileTypeColor } from "@/lib/utils/fileUtils";

export interface LocalAttachment {
  uri: string;
  type: "image" | "file" | "audio";
  name: string;
  mimeType: string;
  size?: number;
  uploading?: boolean;
}

interface AttachmentPreviewProps {
  attachments: LocalAttachment[];
  onRemove: (index: number) => void;
}

export function AttachmentPreview({
  attachments,
  onRemove,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {attachments.map((attachment, idx) => (
        <View key={`${attachment.uri}-${idx}`} style={styles.itemWrapper}>
          {attachment.type === "image" ? (
            <ImageAttachment
              attachment={attachment}
              onRemove={() => onRemove(idx)}
            />
          ) : attachment.type === "audio" ? (
            <AudioAttachment
              attachment={attachment}
              onRemove={() => onRemove(idx)}
            />
          ) : (
            <FileAttachment
              attachment={attachment}
              onRemove={() => onRemove(idx)}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function ImageAttachment({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: () => void;
}) {
  return (
    <View style={styles.imageContainer}>
      <Image source={{ uri: attachment.uri }} style={styles.image} />
      {attachment.uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={onRemove}
        activeOpacity={0.7}
      >
        <X size={12} color="#fff" />
      </TouchableOpacity>
      {attachment.size && (
        <View style={styles.sizeBadge}>
          <Text style={styles.sizeText}>{formatSize(attachment.size)}</Text>
        </View>
      )}
    </View>
  );
}

function AudioAttachment({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: () => void;
}) {
  return (
    <View style={styles.audioContainer}>
      <View style={styles.audioIcon}>
        <Mic size={14} color={colors.primary} />
      </View>
      <View style={styles.audioInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {attachment.name}
        </Text>
        {attachment.size && (
          <Text style={styles.fileSizeText}>{formatSize(attachment.size)}</Text>
        )}
      </View>
      {attachment.uploading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7}>
          <X size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function FileAttachment({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: () => void;
}) {
  const iconColor = getFileTypeColor(attachment.name);

  return (
    <View style={styles.fileContainer}>
      <FileText size={16} color={iconColor} />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {attachment.name}
        </Text>
        {attachment.size && (
          <Text style={styles.fileSizeText}>{formatSize(attachment.size)}</Text>
        )}
      </View>
      {attachment.uploading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7}>
          <X size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 80,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: "row",
  },
  itemWrapper: {
    marginRight: spacing.sm,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.muted,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  sizeBadge: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  sizeText: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: "#fff",
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  audioIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  audioInfo: {
    maxWidth: 100,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileInfo: {
    maxWidth: 100,
  },
  fileName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  fileSizeText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
});
