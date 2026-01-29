import { Plus, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Keyboard,
  type NativeSyntheticEvent,
  Text,
  TextInput,
  type TextInputSubmitEditingEventData,
  View,
} from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

interface TagInputProps {
  tags: string[];
  suggestedTags?: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onAcceptSuggested?: (tag: string) => void;
}

export function TagInput({
  tags,
  suggestedTags = [],
  onAddTag,
  onRemoveTag,
  onAcceptSuggested,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = useCallback(
    (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
      const value = e.nativeEvent.text.trim().toLowerCase();
      if (value && value.length >= 2 && value.length <= 30) {
        haptic.light();
        onAddTag(value);
        setInputValue("");
      }
    },
    [onAddTag],
  );

  const handleAddPress = useCallback(() => {
    if (inputValue.trim()) {
      const value = inputValue.trim().toLowerCase();
      if (value.length >= 2 && value.length <= 30) {
        haptic.light();
        onAddTag(value);
        setInputValue("");
        Keyboard.dismiss();
      }
    } else {
      setIsAdding(true);
    }
  }, [inputValue, onAddTag]);

  const handleRemove = useCallback(
    (tag: string) => {
      haptic.light();
      onRemoveTag(tag);
    },
    [onRemoveTag],
  );

  const handleAcceptSuggested = useCallback(
    (tag: string) => {
      haptic.light();
      onAcceptSuggested?.(tag);
    },
    [onAcceptSuggested],
  );

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Existing Tags */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.xs,
        }}
      >
        {tags.map((tag) => (
          <View
            key={tag}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: spacing.sm,
              paddingRight: spacing.xs,
              paddingVertical: spacing.xs,
              backgroundColor: palette.glassMedium,
              borderRadius: layout.radius.sm,
              gap: spacing.xs,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlight,
              }}
            >
              #{tag}
            </Text>
            <AnimatedPressable
              onPress={() => handleRemove(tag)}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: palette.glassLow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} color={palette.starlightDim} />
            </AnimatedPressable>
          </View>
        ))}

        {/* Add Tag Button / Input */}
        {isAdding || inputValue ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingLeft: spacing.sm,
              paddingRight: spacing.xs,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.sm,
              borderWidth: 1,
              borderColor: palette.roseQuartz,
            }}
          >
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
              }}
            >
              #
            </Text>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleSubmit}
              onBlur={() => {
                if (!inputValue.trim()) setIsAdding(false);
              }}
              autoFocus
              placeholder="tag"
              placeholderTextColor={palette.starlightDim}
              autoCapitalize="none"
              returnKeyType="done"
              maxLength={30}
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlight,
                paddingVertical: spacing.xs,
                minWidth: 60,
              }}
            />
            {inputValue.trim() && (
              <AnimatedPressable
                onPress={handleAddPress}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: palette.roseQuartz,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={12} color={palette.void} />
              </AnimatedPressable>
            )}
          </View>
        ) : (
          <AnimatedPressable
            onPress={handleAddPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.sm,
              borderWidth: 1,
              borderColor: palette.glassBorder,
              borderStyle: "dashed",
              gap: spacing.xs,
            }}
          >
            <Plus size={14} color={palette.starlightDim} />
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 13,
                color: palette.starlightDim,
              }}
            >
              Add tag
            </Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Suggested Tags */}
      {suggestedTags.length > 0 && onAcceptSuggested && (
        <View>
          <Text
            style={{
              fontFamily: typography.body,
              fontSize: 12,
              color: palette.starlightDim,
              marginBottom: spacing.xs,
            }}
          >
            Suggested:
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.xs,
            }}
          >
            {suggestedTags
              .filter((tag) => !tags.includes(tag))
              .map((tag) => (
                <AnimatedPressable
                  key={tag}
                  onPress={() => handleAcceptSuggested(tag)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    backgroundColor: palette.glassLow,
                    borderRadius: layout.radius.sm,
                    borderWidth: 1,
                    borderColor: palette.glassBorder,
                    gap: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body,
                      fontSize: 13,
                      color: palette.starlightDim,
                    }}
                  >
                    #{tag}
                  </Text>
                  <Plus size={12} color={palette.starlightDim} />
                </AnimatedPressable>
              ))}
          </View>
        </View>
      )}
    </View>
  );
}
