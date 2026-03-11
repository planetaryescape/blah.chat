import type { ChatComposerCommandDefinition } from "@blah-chat/chat-ui-core";
import { ArrowLeftRight, Braces, Sparkles, Zap } from "lucide-react-native";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

const ICONS = {
  model: Sparkles,
  think: Zap,
  template: Braces,
  compare: ArrowLeftRight,
} as const;

interface SlashCommandMenuProps {
  commands: ChatComposerCommandDefinition[];
  selectedIndex: number;
  visible: boolean;
  onSelect: (command: ChatComposerCommandDefinition) => void;
}

export function SlashCommandMenu({
  commands,
  selectedIndex,
  visible,
  onSelect,
}: SlashCommandMenuProps) {
  if (!visible) return null;

  return (
    <View
      style={{
        marginBottom: spacing.sm,
        borderRadius: layout.radius.lg,
        borderWidth: 1,
        borderColor: palette.glassBorder,
        backgroundColor: palette.glassLow,
        overflow: "hidden",
      }}
    >
      {commands.map((command, index) => {
        const Icon = ICONS[command.id];
        const isActive = index === selectedIndex;
        return (
          <AnimatedPressable
            key={command.id}
            onPress={() => onSelect(command)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: isActive ? palette.glassMedium : "transparent",
            }}
          >
            <Icon size={16} color={palette.starlight} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: typography.bodySemiBold,
                  fontSize: 14,
                  color: palette.starlight,
                }}
              >
                {command.label}
              </Text>
              <Text
                style={{
                  fontFamily: typography.body,
                  fontSize: 12,
                  color: palette.starlightDim,
                }}
              >
                /{command.aliases[0]}
              </Text>
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
