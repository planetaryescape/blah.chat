import { X, Mic } from "lucide-react-native";
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { colors } from "@/lib/theme/colors";
import { radius, spacing } from "@/lib/theme/spacing";

export interface LocalAttachment {
  id?: string;
  type: "image" | "file" | "audio";
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  storageId?: string;
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
      {attachments.map((att, index) => (
        <View key={att.id || index} style={styles.item}>
          {att.type === "image" ? (
            <Image source={{ uri: att.uri }} style={styles.image} />
          ) : att.type === "audio" ? (
            <View style={styles.audioPlaceholder}>
              <Mic size={24} color={colors.primary} />
            </View>
          ) : (
            <View style={styles.filePlaceholder}>
              <Text style={styles.fileExt}>{att.name.split(".").pop()}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(index)}
          >
            <X size={12} color="white" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 80,
    marginBottom: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  item: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.muted,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  filePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  audioPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  fileExt: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: "bold",
  },
  removeButton: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: radius.full,
    padding: 2,
  },
});
