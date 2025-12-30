import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import {
  Check,
  Copy,
  Link,
  Lock,
  Share2,
  Timer,
  UserX,
} from "lucide-react-native";
import { forwardRef, useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { createGlassBackground } from "@/components/ui/GlassBackground";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { radius, spacing } from "@/lib/theme/spacing";

const GlassBackgroundComponent = createGlassBackground();
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animated chip with bounce effect
function AnimatedChip({
  label,
  isActive,
  onPress,
  style,
  textStyle,
  activeStyle,
  activeTextStyle,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  style: object;
  textStyle: object;
  activeStyle?: object;
  activeTextStyle?: object;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.92, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
    haptics.selection();
    onPress();
  };

  return (
    <AnimatedPressable
      style={[style, isActive && activeStyle, animatedStyle]}
      onPress={handlePress}
    >
      <Text style={[textStyle, isActive && activeTextStyle]}>{label}</Text>
    </AnimatedPressable>
  );
}

interface ShareModalProps {
  conversationId: Id<"conversations"> | null;
  onShared?: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 day", value: 1 },
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "Never", value: undefined },
] as const;

const SHARE_URL_BASE = "https://blah.chat";

export const ShareModal = forwardRef<BottomSheetModal, ShareModalProps>(
  ({ conversationId, onShared }, ref) => {
    const snapPoints = useMemo(() => ["65%", "85%"], []);
    const [password, setPassword] = useState("");
    const [expiresIn, setExpiresIn] = useState<number | undefined>(7);
    const [anonymize, setAnonymize] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [copied, setCopied] = useState(false);

    const existingShare = useQuery(
      // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
      api.shares.getByConversation,
      conversationId ? { conversationId } : "skip",
    ) as
      | {
          shareId: string;
          isActive: boolean;
          password?: string;
          expiresAt?: number;
          anonymizeUsernames: boolean;
        }
      | null
      | undefined;

    const createShare = useAction(
      // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
      api.shares.create,
    );
    const toggleShare = useMutation(
      // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
      api.shares.toggle,
    );

    const shareUrl = useMemo(() => {
      if (existingShare?.shareId) {
        return `${SHARE_URL_BASE}/share/${existingShare.shareId}`;
      }
      return null;
    }, [existingShare]);

    const handleCreate = useCallback(async () => {
      if (!conversationId || isCreating) return;

      setIsCreating(true);
      haptics.medium();

      try {
        await createShare({
          conversationId,
          password: password || undefined,
          expiresIn,
          anonymizeUsernames: anonymize,
        });

        haptics.success();
        onShared?.();
      } catch (error) {
        console.error("Failed to create share:", error);
        haptics.error();
        Alert.alert("Error", "Failed to create share link");
      } finally {
        setIsCreating(false);
      }
    }, [
      conversationId,
      password,
      expiresIn,
      anonymize,
      createShare,
      onShared,
      isCreating,
    ]);

    const handleCopy = useCallback(async () => {
      if (!shareUrl) return;

      await Clipboard.setStringAsync(shareUrl);
      haptics.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, [shareUrl]);

    const handleToggle = useCallback(
      async (isActive: boolean) => {
        if (!conversationId) return;

        try {
          await toggleShare({ conversationId, isActive });
          haptics.light();
        } catch (error) {
          console.error("Failed to toggle share:", error);
        }
      },
      [conversationId, toggleShare],
    );

    const formatExpiry = (expiresAt?: number) => {
      if (!expiresAt) return null;
      return new Date(expiresAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundComponent={GlassBackgroundComponent}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Share2 size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.title}>Share Conversation</Text>
              <Text style={styles.subtitle}>Create a shareable link</Text>
            </View>
          </View>

          {shareUrl ? (
            <View style={styles.existingShareContainer}>
              {/* Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Sharing enabled</Text>
                <Switch
                  value={existingShare?.isActive ?? true}
                  onValueChange={handleToggle}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.primaryForeground}
                />
              </View>

              {/* URL + Copy */}
              <View style={styles.urlContainer}>
                <View style={styles.urlRow}>
                  <Link size={16} color={colors.mutedForeground} />
                  <Text style={styles.urlText} numberOfLines={1}>
                    {shareUrl}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  {copied ? (
                    <Check size={20} color={colors.success} />
                  ) : (
                    <Copy size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Status */}
              {existingShare?.isActive === false ? (
                <View style={styles.warningBanner}>
                  <Text style={styles.warningText}>
                    Sharing is disabled. Anyone with the link will see
                    "revoked".
                  </Text>
                </View>
              ) : (
                <View style={styles.infoBanner}>
                  <Text style={styles.infoText}>
                    Anyone with this link can view the conversation
                    {existingShare?.password && " (password required)"}
                    {existingShare?.expiresAt &&
                      ` • Expires ${formatExpiry(existingShare.expiresAt)}`}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Password */}
              <View style={styles.optionSection}>
                <View style={styles.optionHeader}>
                  <Lock size={16} color={colors.mutedForeground} />
                  <Text style={styles.optionLabel}>Password (optional)</Text>
                </View>
                <BottomSheetTextInput
                  style={styles.input}
                  placeholder="Leave empty for no password"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Expiry */}
              <View style={styles.optionSection}>
                <View style={styles.optionHeader}>
                  <Timer size={16} color={colors.mutedForeground} />
                  <Text style={styles.optionLabel}>Expires in</Text>
                </View>
                <View style={styles.expiryOptions}>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <AnimatedChip
                      key={opt.label}
                      label={opt.label}
                      isActive={expiresIn === opt.value}
                      onPress={() => setExpiresIn(opt.value)}
                      style={styles.expiryChip}
                      textStyle={styles.expiryChipText}
                      activeStyle={styles.expiryChipActive}
                      activeTextStyle={styles.expiryChipTextActive}
                    />
                  ))}
                </View>
              </View>

              {/* Anonymize */}
              <View style={styles.optionSection}>
                <View style={styles.toggleRow}>
                  <View style={styles.optionHeader}>
                    <UserX size={16} color={colors.mutedForeground} />
                    <Text style={styles.optionLabel}>Anonymize usernames</Text>
                  </View>
                  <Switch
                    value={anonymize}
                    onValueChange={setAnonymize}
                    trackColor={{ false: colors.muted, true: colors.primary }}
                    thumbColor={colors.primaryForeground}
                  />
                </View>
                <Text style={styles.optionHint}>
                  Replace your name with "User" in shared view
                </Text>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  isCreating && styles.createButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={isCreating}
                activeOpacity={0.8}
              >
                <Share2 size={18} color={colors.primaryForeground} />
                <Text style={styles.createButtonText}>
                  {isCreating ? "Creating..." : "Create Share Link"}
                </Text>
              </TouchableOpacity>
            </BottomSheetScrollView>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ShareModal.displayName = "ShareModal";

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  optionSection: {
    marginBottom: spacing.lg,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.foreground,
  },
  optionHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    marginLeft: spacing.lg + spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expiryOptions: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  expiryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expiryChipActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  expiryChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  expiryChipTextActive: {
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    color: colors.foreground,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    color: colors.primaryForeground,
  },
  existingShareContainer: {
    flex: 1,
  },
  urlContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  urlText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.link,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  warningBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: `${colors.error}15`,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.error,
  },
  infoBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: `${colors.primary}10`,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mutedForeground,
  },
});
