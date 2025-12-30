import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Code,
  FileText,
  History,
  Save,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

type CanvasDocument = Doc<"canvasDocuments">;

interface CanvasDrawerProps {
  conversationId: Id<"conversations">;
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function CanvasDrawer({
  conversationId,
  visible,
  onClose,
}: CanvasDrawerProps) {
  const insets = useSafeAreaInsets();
  const [selectedDocId, setSelectedDocId] =
    useState<Id<"canvasDocuments"> | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const translateX = useSharedValue(SCREEN_WIDTH);

  // Fetch documents for this conversation
  const documents = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
    api.canvas.documents.listByConversation,
    { conversationId },
  ) as CanvasDocument[] | undefined;

  // Fetch selected document
  const selectedDoc = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
    api.canvas.documents.get,
    selectedDocId ? { documentId: selectedDocId } : "skip",
  ) as CanvasDocument | null | undefined;

  const updateContent = useMutation(
    // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
    api.canvas.documents.updateContent,
  );

  // Animate drawer
  useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    } else {
      translateX.value = withSpring(SCREEN_WIDTH, {
        damping: 20,
        stiffness: 200,
      });
    }
  }, [visible, translateX]);

  // Auto-select first document when loaded
  useEffect(() => {
    if (documents && documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0]._id as Id<"canvasDocuments">);
    }
  }, [documents, selectedDocId]);

  // Sync edited content when document changes
  useEffect(() => {
    if (selectedDoc) {
      setEditedContent(selectedDoc.content as string);
      setHasChanges(false);
    }
  }, [selectedDoc]);

  const handleContentChange = useCallback(
    (text: string) => {
      setEditedContent(text);
      setHasChanges(text !== (selectedDoc?.content as string));
    },
    [selectedDoc],
  );

  const handleSave = useCallback(async () => {
    if (!selectedDocId || !hasChanges || isSaving) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateContent({
        documentId: selectedDocId,
        content: editedContent,
        source: "user_edit" as const,
      });
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to save:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedDocId, editedContent, hasChanges, isSaving, updateContent]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      // Could show a confirmation dialog here
      // For now, just discard changes
    }
    runOnJS(onClose)();
  }, [hasChanges, onClose]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const renderDocumentList = () => (
    <View style={styles.documentList}>
      <Text style={styles.sectionTitle}>Documents</Text>
      {documents?.map((doc) => {
        // Cast for TypeScript - Convex Doc types are generic
        const docId = doc._id as Id<"canvasDocuments">;
        const title = doc.title as string;
        const language = doc.language as string | undefined;
        const documentType = doc.documentType as string;

        return (
          <TouchableOpacity
            key={docId}
            style={[
              styles.documentItem,
              selectedDocId === docId && styles.documentItemSelected,
            ]}
            onPress={() => {
              setSelectedDocId(docId);
              Haptics.selectionAsync();
            }}
          >
            {documentType === "code" ? (
              <Code size={16} color={colors.primary} />
            ) : (
              <FileText size={16} color={colors.link} />
            )}
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle} numberOfLines={1}>
                {title}
              </Text>
              {language && <Text style={styles.documentMeta}>{language}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      {(!documents || documents.length === 0) && (
        <Text style={styles.emptyText}>
          No documents yet. Documents are created by the AI during
          conversations.
        </Text>
      )}
    </View>
  );

  const renderEditor = () => {
    if (!selectedDoc) {
      return (
        <View style={styles.emptyEditor}>
          <FileText size={48} color={colors.border} />
          <Text style={styles.emptyEditorText}>Select a document to edit</Text>
        </View>
      );
    }

    // Cast for TypeScript - Convex Doc types are generic
    const title = selectedDoc.title as string;
    const language = selectedDoc.language as string | undefined;
    const documentType = selectedDoc.documentType as string;
    const version = selectedDoc.version as number;

    return (
      <View style={styles.editor}>
        <View style={styles.editorHeader}>
          <View style={styles.editorTitleRow}>
            <Text style={styles.editorTitle} numberOfLines={1}>
              {title}
            </Text>
            {language && (
              <View style={styles.languageBadge}>
                <Text style={styles.languageText}>{language}</Text>
              </View>
            )}
          </View>
          <View style={styles.editorActions}>
            <TouchableOpacity style={styles.actionButton} disabled>
              <History size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges || isSaving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <>
                  <Save size={16} color={colors.primaryForeground} />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.editorContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={[
              styles.codeInput,
              documentType === "code" && styles.codeInputMono,
            ]}
            value={editedContent}
            onChangeText={handleContentChange}
            multiline
            textAlignVertical="top"
            placeholder="Start typing..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={documentType !== "code"}
          />
        </ScrollView>

        <View style={styles.editorFooter}>
          <Text style={styles.footerText}>
            Version {version} • {documentType}
            {hasChanges && " • Unsaved changes"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.drawer,
            animatedStyle,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <ChevronLeft size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Canvas</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {renderDocumentList()}
            <View style={styles.divider} />
            {renderEditor()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    flex: 0.15,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    flex: 0.85,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  documentList: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  documentItemSelected: {
    backgroundColor: `${colors.primary}15`,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  documentMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  editor: {
    flex: 1,
  },
  emptyEditor: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyEditorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editorTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  editorTitle: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
    flexShrink: 1,
  },
  languageBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  languageText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.mutedForeground,
  },
  editorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    color: colors.primaryForeground,
  },
  editorContent: {
    flex: 1,
  },
  codeInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.foreground,
    padding: spacing.md,
    minHeight: 300,
    lineHeight: 22,
  },
  codeInputMono: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  editorFooter: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mutedForeground,
  },
});
