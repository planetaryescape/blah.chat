import type { Doc, Id } from "@blah-chat/backend";
import { api } from "@blah-chat/backend/convex/_generated/api";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { AlertCircle, FileText, Sparkles } from "lucide-react-native";
import { useCallback, useRef } from "react";
import {
  Alert,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ContextMenu from "react-native-context-menu-view";
import Markdown from "react-native-markdown-display";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";
import { formatSize, getFileTypeColor } from "@/lib/utils/fileUtils";
import { MessageInlineActions } from "./MessageInlineActions";
import {
  ScrollToBottomButton,
  useScrollToBottom,
} from "./ScrollToBottomButton";

type Message = Doc<"messages">;

interface MessageListProps {
  messages: Message[];
  conversationId: string;
}

// Component to display message attachments
function MessageAttachments({ messageId }: { messageId: Id<"messages"> }) {
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const attachments = useQuery(api.messages.attachments.getAttachments, {
    messageId,
  });

  if (!attachments || attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={attachmentStyles.container}
      contentContainerStyle={attachmentStyles.content}
    >
      {attachments.map((att: any, idx: number) => (
        <AttachmentItem key={att._id || idx} attachment={att} />
      ))}
    </ScrollView>
  );
}

function AttachmentItem({ attachment }: { attachment: any }) {
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const url = useQuery(api.files.getFileUrl, {
    storageId: attachment.storageId,
  });

  if (attachment.type === "image") {
    return (
      <View style={attachmentStyles.imageContainer}>
        {url ? (
          <Image source={{ uri: url }} style={attachmentStyles.image} />
        ) : (
          <View style={attachmentStyles.imagePlaceholder} />
        )}
      </View>
    );
  }

  const iconColor = getFileTypeColor(attachment.name);

  return (
    <View style={attachmentStyles.fileContainer}>
      <FileText size={16} color={iconColor} />
      <View style={attachmentStyles.fileInfo}>
        <Text style={attachmentStyles.fileName} numberOfLines={1}>
          {attachment.name}
        </Text>
        <Text style={attachmentStyles.fileSize}>
          {formatSize(attachment.size)}
        </Text>
      </View>
    </View>
  );
}

const attachmentStyles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  content: {
    gap: spacing.sm,
    flexDirection: "row",
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.muted,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.muted,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileInfo: {
    maxWidth: 120,
  },
  fileName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  fileSize: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
  },
});

export function MessageList({ messages, conversationId }: MessageListProps) {
  // @ts-ignore - FlashList ref type
  const listRef = useRef(null);
  const { showButton, onScroll } = useScrollToBottom();
  const router = useRouter();

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const deleteMessage = useMutation(api.chat.deleteMessage);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const branchFromMessage = useMutation(api.chat.branchFromMessage);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createNote = useMutation(api.notes.create);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createBookmark = useMutation(api.bookmarks.create);

  // Context menu actions based on message type
  const getContextMenuActions = useCallback((msg: Message) => {
    const isUser = msg.role === "user";
    const isComplete = msg.status === "complete";

    const actions: Array<{
      title: string;
      systemIcon: string;
      destructive?: boolean;
    }> = [
      { title: "Copy", systemIcon: "doc.on.doc" },
      { title: "Bookmark", systemIcon: "bookmark" },
      { title: "Branch", systemIcon: "arrow.triangle.branch" },
    ];

    if (!isUser && isComplete) {
      actions.push(
        { title: "Read Aloud", systemIcon: "speaker.wave.2" },
        { title: "Regenerate", systemIcon: "arrow.clockwise" },
        { title: "Save as Note", systemIcon: "doc.text" },
      );
    }

    actions.push({ title: "Delete", systemIcon: "trash", destructive: true });

    return actions;
  }, []);

  // Handle context menu action selection
  const handleContextMenuAction = useCallback(
    async (actionTitle: string, msg: Message) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      switch (actionTitle) {
        case "Copy":
          await Clipboard.setStringAsync(
            msg.content || msg.partialContent || "",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "Bookmark":
          try {
            await createBookmark({ messageId: msg._id as Id<"messages"> });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("Failed to bookmark:", error);
          }
          break;
        case "Branch":
          try {
            const newId = await branchFromMessage({
              messageId: msg._id as Id<"messages">,
            });
            router.push(`/chat/${newId}`);
          } catch (error) {
            console.error("Failed to branch:", error);
          }
          break;
        case "Read Aloud":
          // TTS is handled inline, but also available in context menu
          // For context menu, we just show a hint
          Alert.alert(
            "Tip",
            "Use the TTS button below the message for playback",
          );
          break;
        case "Regenerate":
          // TODO: Open model picker modal
          Alert.alert("Coming Soon", "Regenerate with model picker");
          break;
        case "Save as Note":
          try {
            await createNote({
              title: "Note from chat",
              content: msg.content || msg.partialContent || "",
              format: "markdown",
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error("Failed to save note:", error);
          }
          break;
        case "Delete":
          Alert.alert("Delete Message", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteMessage({ messageId: msg._id as Id<"messages"> });
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                } catch (error) {
                  console.error("Failed to delete:", error);
                }
              },
            },
          ]);
          break;
      }
    },
    [createBookmark, branchFromMessage, createNote, deleteMessage, router],
  );

  // Inline action handlers
  const handleBranchInline = useCallback(
    async (msg: Message) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const newId = await branchFromMessage({
          messageId: msg._id as Id<"messages">,
        });
        router.push(`/chat/${newId}`);
      } catch (error) {
        console.error("Failed to branch:", error);
      }
    },
    [branchFromMessage, router],
  );

  const handleRegenerateInline = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Open model picker modal
    Alert.alert("Coming Soon", "Regenerate with model picker");
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll(event.nativeEvent.contentOffset.y);
    },
    [onScroll],
  );

  const scrollToBottom = useCallback(() => {
    // For inverted list, offset 0 is the bottom (latest messages)
    // @ts-ignore - FlashList scrollToOffset exists at runtime
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  }, []);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    const displayContent = item.partialContent || item.content || "";
    const isGenerating = item.status === "generating";
    const isPending = item.status === "pending";
    const isComplete = item.status === "complete";

    return (
      <ContextMenu
        actions={getContextMenuActions(item)}
        onPress={(e) => handleContextMenuAction(e.nativeEvent.name, item)}
        previewBackgroundColor={colors.background}
      >
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userMessage : styles.assistantMessage,
          ]}
        >
          {/* AI message header */}
          {!isUser && (
            <View style={styles.messageHeader}>
              <View style={styles.avatarContainer}>
                <Sparkles size={14} color={colors.primary} />
              </View>
              <Text style={styles.modelName}>
                {item.model?.split(":")[1] || "AI"}
              </Text>
              {(isGenerating || isPending) && (
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {isPending ? "Thinking" : "Generating"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Message attachments */}
          <MessageAttachments messageId={item._id as Id<"messages">} />

          {/* Message bubble */}
          <View
            style={[
              styles.bubble,
              isUser ? styles.userBubble : styles.assistantBubble,
              isGenerating && styles.generatingBubble,
            ]}
          >
            {isUser ? (
              <Text style={styles.userText}>{displayContent}</Text>
            ) : (
              <Markdown style={markdownStyles}>
                {displayContent || " "}
              </Markdown>
            )}
          </View>

          {/* Inline actions - show for complete AI messages or user messages */}
          {(isComplete || isUser) && (
            <MessageInlineActions
              content={displayContent}
              isAI={!isUser}
              isComplete={isComplete}
              onBranch={() => handleBranchInline(item)}
              onRegenerate={!isUser ? handleRegenerateInline : undefined}
            />
          )}

          {/* Error state */}
          {item.status === "error" && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color={colors.error} />
              <Text style={styles.errorText}>
                {item.error || "Generation failed"}
              </Text>
            </View>
          )}
        </View>
      </ContextMenu>
    );
  };

  // Cast FlashList props to avoid type issues with inverted prop
  const flashListProps = {
    ref: listRef,
    data: messages,
    renderItem: renderMessage,
    inverted: true,
    estimatedItemSize: 120,
    contentContainerStyle: styles.listContent,
    keyExtractor: (item: Message) => item._id,
    keyboardShouldPersistTaps: "handled" as const,
    onScroll: handleScroll,
    scrollEventThrottle: 16,
  };

  return (
    <View style={styles.container}>
      {/* @ts-ignore - FlashList inverted prop type issue */}
      <FlashList {...flashListProps} />
      <ScrollToBottomButton showButton={showButton} onPress={scrollToBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  messageContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  assistantMessage: {
    alignItems: "flex-start",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modelName: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: `${colors.generating}15`,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.generating,
  },
  statusText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.generating,
  },
  bubble: {
    maxWidth: "85%",
    padding: spacing.md,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderRadius: radius.lg,
    borderTopRightRadius: radius.sm, // Flat corner for chat effect
  },
  assistantBubble: {
    backgroundColor: colors.aiBubble,
    borderRadius: radius.lg,
    borderTopLeftRadius: radius.sm, // Flat corner for chat effect
    borderWidth: 1,
    borderColor: colors.border,
  },
  generatingBubble: {
    borderColor: colors.generating,
  },
  userText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.userBubbleText,
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: `${colors.error}15`,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
  },
});

const markdownStyles = {
  body: {
    color: colors.aiBubbleText,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  code_inline: {
    backgroundColor: colors.codeBackground,
    color: colors.primary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: colors.codeBackground,
    color: colors.foreground,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    padding: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.sm,
  },
  fence: {
    backgroundColor: colors.codeBackground,
    color: colors.foreground,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    padding: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.sm,
  },
  heading1: {
    color: colors.foreground,
    fontFamily: fonts.heading,
    fontSize: 24,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading2: {
    color: colors.foreground,
    fontFamily: fonts.headingMedium,
    fontSize: 20,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading3: {
    color: colors.foreground,
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bullet_list: {
    marginVertical: spacing.sm,
  },
  ordered_list: {
    marginVertical: spacing.sm,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: colors.link,
    textDecorationLine: "underline" as const,
  },
  blockquote: {
    backgroundColor: colors.codeBackground,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  strong: {
    fontFamily: fonts.bodySemibold,
    color: colors.foreground,
  },
  em: {
    fontStyle: "italic" as const,
  },
};
