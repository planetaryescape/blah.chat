import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import { Check, Copy, Link, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { useCreateNoteShare, useToggleNoteShare } from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface NoteShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  note: {
    _id: Id<"notes">;
    shareId?: string;
    isPublic?: boolean;
    shareExpiresAt?: number;
  } | null;
}

const EXPIRY_OPTIONS = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "Never", days: undefined },
];

export function NoteShareSheet({ isOpen, onClose, note }: NoteShareSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [password, setPassword] = useState("");
  const [selectedExpiry, setSelectedExpiry] = useState<number | undefined>(7);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShare = useCreateNoteShare();
  const toggleShare = useToggleNoteShare();

  useEffect(() => {
    if (isOpen && note) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen, note]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setPassword("");
        setSelectedExpiry(7);
        setCopied(false);
        onClose();
      }
    },
    [onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleCreateShare = useCallback(async () => {
    if (!note) return;

    setIsCreating(true);
    haptic.medium();

    try {
      await createShare({
        noteId: note._id,
        password: password.trim() || undefined,
        expiresIn: selectedExpiry,
      });
      setPassword("");
      Alert.alert("Share Link Created", "Your note is now shareable.");
    } catch (_e) {
      haptic.error();
      Alert.alert("Error", "Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  }, [note, password, selectedExpiry, createShare]);

  const handleToggleShare = useCallback(
    async (isActive: boolean) => {
      if (!note) return;

      haptic.light();
      try {
        await toggleShare({ noteId: note._id, isActive });
      } catch {
        haptic.error();
      }
    },
    [note, toggleShare],
  );

  const handleCopyLink = useCallback(async () => {
    if (!note?.shareId) return;

    const url = `https://blah.chat/shared/notes/${note.shareId}`;
    await Clipboard.setStringAsync(url);
    setCopied(true);
    haptic.success();

    setTimeout(() => setCopied(false), 2000);
  }, [note?.shareId]);

  if (!note) return null;

  const hasShare = !!note.shareId;
  const shareUrl = hasShare
    ? `https://blah.chat/shared/notes/${note.shareId}`
    : "";

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      onChange={handleSheetChange}
      enablePanDownToClose
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: palette.nebula,
        borderTopLeftRadius: layout.radius.xl,
        borderTopRightRadius: layout.radius.xl,
      }}
      handleIndicatorStyle={{
        backgroundColor: palette.starlightDim,
        width: 40,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: spacing.lg,
            marginTop: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <Share2 size={24} color={palette.roseQuartz} />
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 20,
              color: palette.starlight,
            }}
          >
            Share Note
          </Text>
        </View>

        {hasShare ? (
          <>
            {/* Share URL Display */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 14,
                  color: palette.starlightDim,
                  marginBottom: spacing.xs,
                }}
              >
                Share Link
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: palette.glassLow,
                  borderRadius: layout.radius.md,
                  padding: spacing.sm,
                  gap: spacing.sm,
                }}
              >
                <Link size={16} color={palette.starlightDim} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: typography.body,
                    fontSize: 13,
                    color: palette.starlight,
                  }}
                  numberOfLines={1}
                >
                  {shareUrl}
                </Text>
                <AnimatedPressable
                  onPress={handleCopyLink}
                  style={{
                    padding: spacing.xs,
                    backgroundColor: palette.glassMedium,
                    borderRadius: layout.radius.sm,
                  }}
                >
                  {copied ? (
                    <Check size={18} color={palette.success} />
                  ) : (
                    <Copy size={18} color={palette.starlight} />
                  )}
                </AnimatedPressable>
              </View>
            </View>

            {/* Enable/Disable Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: palette.glassLow,
                borderRadius: layout.radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <View>
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.starlight,
                  }}
                >
                  Share enabled
                </Text>
                <Text
                  style={{
                    fontFamily: typography.body,
                    fontSize: 13,
                    color: palette.starlightDim,
                  }}
                >
                  {note.isPublic
                    ? "Anyone with the link can view"
                    : "Link is currently disabled"}
                </Text>
              </View>
              <Switch
                value={note.isPublic}
                onValueChange={handleToggleShare}
                trackColor={{
                  false: palette.glassBorder,
                  true: palette.roseQuartz,
                }}
                thumbColor={palette.starlight}
              />
            </View>

            {/* Expiry Info */}
            {note.shareExpiresAt && (
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 13,
                  color: palette.starlightDim,
                  textAlign: "center",
                }}
              >
                Expires:{" "}
                {new Date(note.shareExpiresAt).toLocaleDateString(undefined, {
                  dateStyle: "medium",
                })}
              </Text>
            )}
          </>
        ) : (
          <>
            {/* Password Input */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 14,
                  color: palette.starlightDim,
                  marginBottom: spacing.xs,
                }}
              >
                Password (optional)
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Leave empty for no password"
                placeholderTextColor={palette.starlightDim}
                secureTextEntry
                style={{
                  fontFamily: typography.body,
                  fontSize: 15,
                  color: palette.starlight,
                  backgroundColor: palette.glassLow,
                  borderRadius: layout.radius.md,
                  padding: spacing.md,
                }}
              />
            </View>

            {/* Expiry Selector */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 14,
                  color: palette.starlightDim,
                  marginBottom: spacing.sm,
                }}
              >
                Link expires in
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing.xs,
                }}
              >
                {EXPIRY_OPTIONS.map((option) => {
                  const isSelected = selectedExpiry === option.days;
                  return (
                    <AnimatedPressable
                      key={option.label}
                      onPress={() => {
                        haptic.light();
                        setSelectedExpiry(option.days);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: spacing.sm,
                        borderRadius: layout.radius.md,
                        backgroundColor: isSelected
                          ? palette.roseQuartz
                          : palette.glassLow,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.bodySemiBold,
                          fontSize: 13,
                          color: isSelected ? palette.void : palette.starlight,
                        }}
                      >
                        {option.label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {/* Create Button */}
            <AnimatedPressable
              onPress={handleCreateShare}
              disabled={isCreating}
              style={{
                paddingVertical: spacing.md,
                borderRadius: layout.radius.md,
                backgroundColor: palette.roseQuartz,
                alignItems: "center",
                opacity: isCreating ? 0.7 : 1,
              }}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={palette.void} />
              ) : (
                <Text
                  style={{
                    fontFamily: typography.bodySemiBold,
                    fontSize: 15,
                    color: palette.void,
                  }}
                >
                  Create Share Link
                </Text>
              )}
            </AnimatedPressable>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
