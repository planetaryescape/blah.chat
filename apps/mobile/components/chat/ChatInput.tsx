import {
  type ChatComposerCommandDefinition,
  getChatComposerCommandsForSurface,
  getLineStartSlashMatch,
  replaceTextRange,
} from "@blah-chat/chat-ui-core";
import { toast } from "burnt";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronDown,
  Maximize2,
  Mic,
  Minimize2,
  Plus,
  Send,
  Square,
  X,
} from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  type TextInput as TextInputType,
  useWindowDimensions,
  View,
} from "react-native";
import { ChatAttachmentSheet } from "@/components/chat/ChatAttachmentSheet";
import { SlashCommandMenu } from "@/components/chat/SlashCommandMenu";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import type { Id } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import { useChatAttachmentUpload } from "@/lib/hooks/useChatAttachmentUpload";
import { type STTStopMode, useChatSTT } from "@/lib/hooks/useChatSTT";
import { usePreferences } from "@/lib/hooks/usePreferences";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export interface ChatInputRef {
  focus: () => void;
  blur: () => void;
}

export type AttachmentInput = {
  type: "file" | "image" | "audio";
  name: string;
  storageId: string;
  mimeType: string;
  size: number;
};

export type ChatInputSendPayload = {
  content: string;
  attachments?: AttachmentInput[];
};

interface ChatInputProps {
  onSend: (payload: ChatInputSendPayload) => void | Promise<void>;
  value: string;
  onChangeText: (text: string) => void;
  attachments: AttachmentInput[];
  onAttachmentsChange: (attachments: AttachmentInput[]) => void;
  onModelPress?: () => void;
  onThinkingPress?: () => void;
  onTemplatePress?: () => void;
  onComparePress?: () => void;
  modelName?: string;
  conversationId?: Id<"conversations">;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

const LINE_HEIGHT = 22;
const MIN_HEIGHT_SINGLE_LINE = 44;
const MULTILINE_MIN_LINES = 8;
const INPUT_VERTICAL_PADDING = 20;
const MIN_HEIGHT_MULTILINE =
  MULTILINE_MIN_LINES * LINE_HEIGHT + INPUT_VERTICAL_PADDING;
const EXPANDED_MIN_LINES = 14;
const MIN_HEIGHT_EXPANDED =
  EXPANDED_MIN_LINES * LINE_HEIGHT + INPUT_VERTICAL_PADDING;
const COLLAPSED_MAX_HEIGHT = 280;
const EXPANDED_MAX_HEIGHT_RATIO = 0.55;

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      value,
      onChangeText,
      attachments,
      onAttachmentsChange,
      onModelPress,
      onThinkingPress,
      onTemplatePress,
      onComparePress,
      modelName = "GPT-5 Mini",
      conversationId,
      disabled = false,
      isSending = false,
      placeholder = "Message...",
    },
    ref,
  ) {
    const { height: windowHeight } = useWindowDimensions();
    const inputRef = useRef<TextInputType>(null);

    const prefs = usePreferences();
    const sttEnabled = prefs?.sttEnabled ?? true;

    const {
      isUploading,
      isAvailable: attachmentsAvailable,
      uploadAsset,
    } = useChatAttachmentUpload(conversationId);
    const {
      state: sttState,
      isAvailable: sttAvailable,
      startRecording,
      stopRecording,
    } = useChatSTT(sttEnabled);

    const [isAttachmentSheetOpen, setIsAttachmentSheetOpen] = useState(false);
    const [inputHeight, setInputHeight] = useState(MIN_HEIGHT_SINGLE_LINE);
    const [contentHeight, setContentHeight] = useState(MIN_HEIGHT_SINGLE_LINE);
    const [isExpanded, setIsExpanded] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [slashIndex, setSlashIndex] = useState(0);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    const hasText = value.trim().length > 0;
    const isRecording = sttState === "recording";
    const isTranscribing = sttState === "transcribing";
    const isBusy = disabled || isSending || isUploading || isTranscribing;

    const showMic =
      !hasText && sttState === "idle" && sttEnabled && sttAvailable;
    const showSend = hasText || isRecording || isSending;
    const showRightAction = showMic || showSend || isTranscribing;

    const inputMaxHeight = isExpanded
      ? Math.max(
          MIN_HEIGHT_EXPANDED,
          Math.floor(windowHeight * EXPANDED_MAX_HEIGHT_RATIO),
        )
      : COLLAPSED_MAX_HEIGHT;
    const slashMatch = getLineStartSlashMatch(value, cursorPosition);
    const slashCommands = slashMatch
      ? getChatComposerCommandsForSurface("mobile").filter((command) =>
          command.aliases.some((alias) => alias.startsWith(slashMatch.query)),
        )
      : [];
    const slashMenuVisible =
      slashCommands.length > 0 && !isRecording && !disabled && !isBusy;

    const calculateNextHeight = useCallback(
      (nextContentHeight: number, nextText: string, expanded: boolean) => {
        const hasMultilineContent =
          nextText.includes("\n") || nextContentHeight > MIN_HEIGHT_SINGLE_LINE;
        const minHeight = expanded
          ? MIN_HEIGHT_EXPANDED
          : hasMultilineContent
            ? MIN_HEIGHT_MULTILINE
            : MIN_HEIGHT_SINGLE_LINE;

        return Math.min(Math.max(minHeight, nextContentHeight), inputMaxHeight);
      },
      [inputMaxHeight],
    );

    useEffect(() => {
      setInputHeight(calculateNextHeight(contentHeight, value, isExpanded));
    }, [calculateNextHeight, contentHeight, isExpanded, value]);

    useEffect(() => {
      setSlashIndex(0);
    }, [slashMatch?.query, slashCommands.length]);

    const applySlashCommand = useCallback(
      (command: ChatComposerCommandDefinition) => {
        if (!slashMatch || disabled || isBusy) return;

        const next = replaceTextRange(
          value,
          slashMatch.rangeStart,
          slashMatch.rangeEnd,
          "",
        );
        onChangeText(next.text);
        setCursorPosition(next.cursor);

        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.setNativeProps({
            selection: { start: next.cursor, end: next.cursor },
          });
        });

        if (command.id === "model") {
          onModelPress?.();
          return;
        }
        if (command.id === "think") {
          onThinkingPress?.();
          return;
        }
        if (command.id === "template") {
          onTemplatePress?.();
          return;
        }
        onComparePress?.();
      },
      [
        disabled,
        isBusy,
        onChangeText,
        onComparePress,
        onModelPress,
        onTemplatePress,
        onThinkingPress,
        slashMatch,
        value,
      ],
    );

    const removeAttachment = useCallback(
      (index: number) => {
        onAttachmentsChange(attachments.filter((_, i) => i !== index));
      },
      [attachments, onAttachmentsChange],
    );

    const handleChangeText = useCallback(
      (value: string) => {
        onChangeText(value);

        if (value.length === 0) {
          setContentHeight(MIN_HEIGHT_SINGLE_LINE);
        }
      },
      [onChangeText],
    );

    const resetInputAfterSend = useCallback(() => {
      onChangeText("");
      onAttachmentsChange([]);
      setContentHeight(MIN_HEIGHT_SINGLE_LINE);
      setIsExpanded(false);
      setInputHeight(MIN_HEIGHT_SINGLE_LINE);
      setCursorPosition(0);
      inputRef.current?.focus();
    }, [onAttachmentsChange, onChangeText]);

    const sendPayload = useCallback(
      async (content: string) => {
        const trimmed = content.trim();
        if (trimmed.length === 0) return;

        await onSend({
          content: trimmed,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

        resetInputAfterSend();
      },
      [attachments, onSend, resetInputAfterSend],
    );

    const handleStopRecording = useCallback(
      async (mode: STTStopMode) => {
        const transcript = await stopRecording(mode);
        if (!transcript) return;

        if (mode === "insert") {
          const nextText =
            value.trim().length > 0
              ? `${value.trim()} ${transcript}`
              : transcript;
          onChangeText(nextText);
          inputRef.current?.focus();
          return;
        }

        await sendPayload(transcript);
      },
      [onChangeText, sendPayload, stopRecording, value],
    );

    const handleRightActionPress = useCallback(async () => {
      if (isBusy) return;

      if (isRecording) {
        await handleStopRecording("send");
        return;
      }

      if (showMic) {
        const started = await startRecording();
        if (started) haptic.medium();
        return;
      }

      if (showSend && hasText) {
        await sendPayload(value);
      }
    }, [
      handleStopRecording,
      hasText,
      isBusy,
      isRecording,
      sendPayload,
      showMic,
      showSend,
      startRecording,
      value,
    ]);

    const handleUploadFromPicker = useCallback(
      async (asset: {
        uri: string;
        name?: string;
        mimeType?: string;
        size?: number;
      }) => {
        const uploaded = await uploadAsset(asset);
        if (!uploaded) return;
        onAttachmentsChange([...attachments, uploaded]);
      },
      [attachments, onAttachmentsChange, uploadAsset],
    );

    const handleTakePhoto = useCallback(async () => {
      if (isBusy) return;

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        toast({
          preset: "error",
          title: "Camera permission required",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      await handleUploadFromPicker({
        uri: asset.uri,
        name: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    }, [handleUploadFromPicker, isBusy]);

    const handleChoosePhoto = useCallback(async () => {
      if (isBusy) return;

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        toast({
          preset: "error",
          title: "Photo library permission required",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      await handleUploadFromPicker({
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      });
    }, [handleUploadFromPicker, isBusy]);

    const handleChooseFile = useCallback(async () => {
      if (isBusy) return;

      let result: DocumentPicker.DocumentPickerResult;
      try {
        result = await DocumentPicker.getDocumentAsync({
          multiple: false,
          copyToCacheDirectory: true,
        });
      } catch {
        toast({
          preset: "error",
          title: "Unable to open file picker",
        });
        return;
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      await handleUploadFromPicker({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || undefined,
        size: asset.size,
      });
    }, [handleUploadFromPicker, isBusy]);

    const handleLeftActionPress = useCallback(async () => {
      if (isBusy) return;

      if (isRecording) {
        await handleStopRecording("insert");
        return;
      }

      setIsAttachmentSheetOpen(true);
    }, [handleStopRecording, isBusy, isRecording]);

    const handleContentSizeChange = useCallback(
      (event: { nativeEvent: { contentSize: { height: number } } }) => {
        const nextContentHeight = event.nativeEvent.contentSize.height;
        setContentHeight(nextContentHeight);
        const newHeight = calculateNextHeight(
          nextContentHeight,
          value,
          isExpanded,
        );
        setInputHeight(newHeight);
      },
      [calculateNextHeight, isExpanded, value],
    );

    const handleToggleExpand = useCallback(() => {
      setIsExpanded((prev) => !prev);
      inputRef.current?.focus();
    }, []);

    const rightAccessibilityLabel = isTranscribing
      ? "Transcribing"
      : showMic
        ? "Start voice input"
        : isRecording
          ? "Send voice transcript"
          : isSending
            ? "Sending message"
            : "Send message";

    return (
      <>
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: palette.glassBorder,
            backgroundColor: palette.void,
          }}
        >
          <SlashCommandMenu
            commands={slashCommands}
            selectedIndex={slashIndex}
            visible={slashMenuVisible}
            onSelect={applySlashCommand}
          />

          {onModelPress && (
            <AnimatedPressable
              onPress={onModelPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: layout.radius.full,
                backgroundColor: palette.glassLow,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 12,
                  color: palette.starlightDim,
                }}
              >
                {modelName}
              </Text>
              <ChevronDown
                size={14}
                color={palette.starlightDim}
                style={{ marginLeft: 2 }}
              />
            </AnimatedPressable>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: spacing.sm,
            }}
          >
            <AnimatedPressable
              onPress={handleLeftActionPress}
              disabled={
                (isBusy && !isRecording) ||
                (!attachmentsAvailable && !isRecording)
              }
              accessibilityRole="button"
              accessibilityLabel={
                isRecording
                  ? "Stop recording and insert text"
                  : attachmentsAvailable
                    ? "Attach files"
                    : "Attachments unavailable"
              }
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: palette.glassLow,
                borderWidth: 1,
                borderColor: palette.glassBorder,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 2,
                opacity: !attachmentsAvailable && !isRecording ? 0.45 : 1,
              }}
            >
              {isRecording ? (
                <Square size={18} color={palette.starlight} />
              ) : (
                <Plus size={22} color={palette.starlight} />
              )}
            </AnimatedPressable>

            <View
              style={{
                flex: 1,
                backgroundColor: palette.glassLow,
                borderRadius: layout.radius.lg,
                borderWidth: 1,
                borderColor: palette.glassBorder,
                overflow: "hidden",
              }}
            >
              {attachments.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    gap: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    paddingTop: spacing.sm,
                  }}
                >
                  {attachments.map((attachment, index) => (
                    <View
                      key={`${attachment.storageId}-${index}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: layout.radius.full,
                        borderWidth: 1,
                        borderColor: palette.glassBorder,
                        backgroundColor: palette.glassMedium,
                        paddingLeft: spacing.sm,
                        paddingRight: 8,
                        paddingVertical: 5,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          maxWidth: 180,
                          fontFamily: typography.body,
                          fontSize: 12,
                          color: palette.starlight,
                        }}
                      >
                        {attachment.name}
                      </Text>
                      <AnimatedPressable
                        onPress={() => removeAttachment(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${attachment.name}`}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: palette.glassLow,
                        }}
                      >
                        <X size={12} color={palette.starlightDim} />
                      </AnimatedPressable>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  paddingLeft: spacing.md,
                  paddingRight: spacing.xs,
                  paddingVertical: spacing.xs,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={value}
                  onChangeText={handleChangeText}
                  onSelectionChange={(event) => {
                    setCursorPosition(event.nativeEvent.selection.start);
                  }}
                  onContentSizeChange={handleContentSizeChange}
                  placeholder={placeholder}
                  placeholderTextColor={palette.starlightDim}
                  multiline
                  submitBehavior={
                    prefs?.sendOnEnter ? "blurAndSubmit" : "newline"
                  }
                  onSubmitEditing={() => {
                    if (prefs?.sendOnEnter) {
                      void sendPayload(value);
                    }
                  }}
                  style={{
                    flex: 1,
                    height: inputHeight,
                    maxHeight: inputMaxHeight,
                    fontFamily: typography.body,
                    fontSize: 16,
                    lineHeight: LINE_HEIGHT,
                    color: palette.starlight,
                    paddingTop: 10,
                    paddingBottom: 10,
                  }}
                  editable={!disabled && !isRecording && !isTranscribing}
                />

                <AnimatedPressable
                  onPress={handleToggleExpand}
                  accessibilityLabel={
                    isExpanded
                      ? "Collapse message input"
                      : "Expand message input"
                  }
                  accessibilityRole="button"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.glassMedium,
                    borderWidth: 1,
                    borderColor: palette.glassBorder,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 4,
                  }}
                >
                  {isExpanded ? (
                    <Minimize2 size={14} color={palette.starlightDim} />
                  ) : (
                    <Maximize2 size={14} color={palette.starlightDim} />
                  )}
                </AnimatedPressable>
              </View>

              {!hasText && (
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingBottom: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: 11,
                      color: palette.starlightDim,
                    }}
                  >
                    Type / for model, reasoning, template, or compare.
                  </Text>
                </View>
              )}
            </View>

            {showRightAction && (
              <AnimatedPressable
                onPress={handleRightActionPress}
                disabled={isBusy}
                accessibilityLabel={rightAccessibilityLabel}
                accessibilityRole="button"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor:
                    showSend || isTranscribing
                      ? palette.roseQuartz
                      : palette.glassLow,
                  borderWidth: showSend || isTranscribing ? 0 : 1,
                  borderColor:
                    showSend || isTranscribing
                      ? "transparent"
                      : palette.glassBorder,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 2,
                }}
              >
                {isTranscribing || isSending ? (
                  <ActivityIndicator
                    size="small"
                    color={showSend ? palette.void : palette.starlight}
                  />
                ) : showMic ? (
                  <Mic size={20} color={palette.starlight} />
                ) : (
                  <Send
                    size={18}
                    color={palette.void}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </AnimatedPressable>
            )}
          </View>
        </View>

        <ChatAttachmentSheet
          isOpen={isAttachmentSheetOpen}
          onClose={() => setIsAttachmentSheetOpen(false)}
          onTakePhoto={handleTakePhoto}
          onChoosePhoto={handleChoosePhoto}
          onChooseFile={handleChooseFile}
          disabled={isBusy || !attachmentsAvailable}
        />
      </>
    );
  },
);
