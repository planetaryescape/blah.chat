import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronDown,
  Cpu,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Square,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GlassPane } from "@/components/ui/GlassPane";
import {
  requestCameraPermission,
  requestMediaLibraryPermission,
} from "@/lib/permissions";
import { colors } from "@/lib/theme/colors";
import { palette } from "@/lib/theme/designSystem";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { uploadToConvex } from "@/lib/upload";
import { type Attachment, getAttachmentType } from "@/lib/utils/fileUtils";
import { AttachmentPreview, type LocalAttachment } from "./AttachmentPreview";

const MAX_ATTACHMENTS = 10;

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  onModelPress?: () => void;
  currentModel?: string;
  isGenerating?: boolean;
  disabled?: boolean;
  generateUploadUrl?: () => Promise<string>;
  onStartRecording?: () => void;
}

function getModelDisplayName(modelId?: string): string {
  if (!modelId) return "Select Model";
  const parts = modelId.split(":");
  if (parts.length < 2) return modelId;
  return parts[1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/(\d)/g, " $1")
    .trim();
}

export function ChatInput({
  onSend,
  onStop,
  onModelPress,
  currentModel,
  isGenerating = false,
  disabled = false,
  generateUploadUrl,
  onStartRecording,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [height, setHeight] = useState(44);
  const [_isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Animated focus effects
  const glowOpacity = useSharedValue(0);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      shadowColor: palette.roseQuartz,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity.value,
      shadowRadius: 10,
    };
  });

  const handleFocus = () => {
    setIsFocused(true);
    glowOpacity.value = withTiming(0.5, { duration: 300 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  const addAttachments = useCallback((newAttachments: LocalAttachment[]) => {
    setAttachments((prev) => {
      const combined = [...prev, ...newAttachments];
      if (combined.length > MAX_ATTACHMENTS) {
        Alert.alert(
          "Limit Reached",
          `Maximum ${MAX_ATTACHMENTS} attachments allowed`,
        );
        return prev;
      }
      return combined;
    });
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCamera = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      addAttachments([
        {
          uri: asset.uri,
          type: "image",
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        },
      ]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [addAttachments]);

  const handleImageLibrary = useCallback(async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_ATTACHMENTS,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: LocalAttachment[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image" as const,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      }));
      addAttachments(newAttachments);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [addAttachments]);

  const handleDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newAttachments: LocalAttachment[] = result.assets.map(
          (asset) => ({
            uri: asset.uri,
            type: getAttachmentType(
              asset.mimeType || "application/octet-stream",
            ),
            name: asset.name,
            mimeType: asset.mimeType || "application/octet-stream",
            size: asset.size,
          }),
        );
        addAttachments(newAttachments);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error("Document picker error:", error);
    }
  }, [addAttachments]);

  const showImageOptions = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleCamera();
          else if (buttonIndex === 2) handleImageLibrary();
        },
      );
    } else {
      Alert.alert("Add Image", "Choose an option", [
        { text: "Take Photo", onPress: handleCamera },
        { text: "Choose from Library", onPress: handleImageLibrary },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [handleCamera, handleImageLibrary]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled) return;

    if (attachments.length > 0 && generateUploadUrl) {
      setIsUploading(true);

      try {
        // Upload all attachments
        const uploadedAttachments: Attachment[] = await Promise.all(
          attachments.map(async (att) => {
            const storageId = await uploadToConvex({
              generateUploadUrl,
              fileUri: att.uri,
              mimeType: att.mimeType || "application/octet-stream",
            });
            return {
              type: att.type,
              name: att.name,
              storageId,
              mimeType: att.mimeType || "application/octet-stream",
              size: att.size || 0,
            };
          }),
        );

        onSend(trimmedMessage, uploadedAttachments);
      } catch (error) {
        console.error("Upload failed:", error);
        Alert.alert(
          "Upload Failed",
          "Failed to upload attachments. Please try again.",
        );
        setIsUploading(false);
        return;
      }

      setIsUploading(false);
    } else {
      onSend(trimmedMessage, undefined);
    }

    setMessage("");
    setAttachments([]);
    setHeight(44);
  }, [message, attachments, disabled, generateUploadUrl, onSend]);

  const handleStop = () => {
    onStop?.();
  };

  const handleMicPress = useCallback(() => {
    onStartRecording?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [onStartRecording]);

  const canSend =
    (message.trim().length > 0 || attachments.length > 0) &&
    !disabled &&
    !isUploading;
  const hasContent = message.trim().length > 0 || attachments.length > 0;

  return (
    <View style={styles.container}>
      {/* Attachment previews */}
      <AttachmentPreview
        attachments={attachments}
        onRemove={removeAttachment}
      />

      {/* Model selector pill */}
      {onModelPress && (
        <TouchableOpacity
          style={[styles.modelPill, isGenerating && styles.modelPillDisabled]}
          onPress={onModelPress}
          disabled={isGenerating}
          activeOpacity={0.7}
        >
          <Cpu size={14} color={colors.primary} />
          <Text style={styles.modelText} numberOfLines={1}>
            {getModelDisplayName(currentModel)}
          </Text>
          <ChevronDown size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}

      {/* Floating Glass Bar */}
      <Animated.View style={[styles.glassWrapper, animatedContainerStyle]}>
        <GlassPane
          intensity={30}
          tint="systemUltraThinMaterialDark"
          style={styles.innerGlass}
        >
          <View style={styles.inputRow}>
            {/* Attachment buttons */}
            <View style={styles.attachmentButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={showImageOptions}
                disabled={disabled || isUploading}
                activeOpacity={0.7}
              >
                <ImageIcon size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleDocument}
                disabled={disabled || isUploading}
                activeOpacity={0.7}
              >
                <Paperclip size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Text Input */}
            <TextInput
              style={[
                styles.input,
                { height: Math.max(44, Math.min(height, 120)) },
              ]}
              placeholder="Message..."
              placeholderTextColor={colors.mutedForeground}
              value={message}
              onChangeText={setMessage}
              multiline
              onContentSizeChange={(e) => {
                setHeight(e.nativeEvent.contentSize.height + 20);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              editable={!disabled && !isUploading}
            />

            {/* Mic button or Send/Stop */}
            {isGenerating ? (
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                activeOpacity={0.8}
              >
                <Square size={16} color="#fff" fill="#fff" />
              </TouchableOpacity>
            ) : hasContent ? (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!canSend}
                activeOpacity={0.8}
              >
                <Send size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            ) : onStartRecording ? (
              <TouchableOpacity
                style={styles.micButton}
                onPress={handleMicPress}
                disabled={disabled}
                activeOpacity={0.8}
              >
                <Mic size={20} color={colors.foreground} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, styles.sendButtonDisabled]}
                disabled
                activeOpacity={0.8}
              >
                <Send size={18} color={colors.primaryForeground} />
              </TouchableOpacity>
            )}
          </View>
        </GlassPane>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    // Container is transparent so the global gradient shows through behind the floating glass bar
  },
  modelPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(45, 38, 64, 0.4)", // Slight transparent bg for pill
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 4,
  },
  modelPillDisabled: {
    opacity: 0.5,
  },
  modelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.foreground,
    maxWidth: 160,
  },
  glassWrapper: {
    borderRadius: 30,
    overflow: "hidden",
    // Remove border from wrapper, let GlassPane handle it or inner logic
  },
  innerGlass: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 30, // Match wrapper
    borderWidth: 1,
    borderColor: "rgba(244, 224, 220, 0.15)", // Subtle rose quartz hint
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  attachmentButtons: {
    flexDirection: "row",
    marginBottom: 4, // align with input bottom?
  },
  iconButton: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.input,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainerFocused: {
    borderColor: colors.ring,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.foreground,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: palette.roseQuartz,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginRight: 2,
  },
  sendButtonDisabled: {
    opacity: 0.3,
    backgroundColor: colors.muted,
  },
  stopButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginRight: 2,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginRight: 2,
  },
});
