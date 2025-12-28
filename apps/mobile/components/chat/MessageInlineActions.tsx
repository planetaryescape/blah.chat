import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Copy, Check, GitBranch, RotateCcw } from "lucide-react-native";
import { useState, useCallback } from "react";
import { TTSPlayer } from "./TTSPlayer";
import { colors } from "@/lib/theme/colors";
import { fonts } from "@/lib/theme/fonts";
import { spacing, radius } from "@/lib/theme/spacing";

interface Props {
  content: string;
  isAI: boolean;
  isComplete: boolean;
  onBranch: () => void;
  onRegenerate?: () => void;
}

export function MessageInlineActions({
  content,
  isAI,
  isComplete,
  onBranch,
  onRegenerate,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <View style={styles.container}>
      {/* Copy - always shown */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleCopy}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {copied ? (
          <Check size={14} color={colors.success} />
        ) : (
          <Copy size={14} color={colors.foreground} />
        )}
        <Text style={[styles.label, copied && styles.labelSuccess]}>
          {copied ? "Copied" : "Copy"}
        </Text>
      </TouchableOpacity>

      {/* Branch - always shown */}
      <TouchableOpacity
        style={styles.button}
        onPress={onBranch}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <GitBranch size={14} color={colors.foreground} />
        <Text style={styles.label}>Branch</Text>
      </TouchableOpacity>

      {/* TTS - AI complete only */}
      {isAI && isComplete && content.length > 0 && <TTSPlayer text={content} />}

      {/* Regenerate - AI complete only */}
      {isAI && isComplete && onRegenerate && (
        <TouchableOpacity
          style={styles.button}
          onPress={onRegenerate}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RotateCcw size={14} color={colors.foreground} />
          <Text style={styles.label}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.foreground,
  },
  labelSuccess: {
    color: colors.success,
  },
});
