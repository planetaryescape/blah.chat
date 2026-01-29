import { ChevronDown, Send } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  type TextInput as TextInputType,
  View,
} from "react-native";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

export interface ChatInputRef {
  focus: () => void;
  blur: () => void;
}

interface ChatInputProps {
  onSend: (content: string) => void;
  onModelPress?: () => void;
  modelName?: string;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      onModelPress,
      modelName = "GPT-5 Mini",
      disabled = false,
      isSending = false,
      placeholder = "Message...",
    },
    ref,
  ) {
    const [text, setText] = useState("");
    const [inputHeight, setInputHeight] = useState(44);
    const inputRef = useRef<TextInputType>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }));

    const canSend = text.trim().length > 0 && !disabled && !isSending;

    const handleSend = useCallback(() => {
      if (!canSend) return;
      onSend(text.trim());
      setText("");
      setInputHeight(44);
      // Auto-focus after send
      inputRef.current?.focus();
    }, [canSend, onSend, text]);

    const handleContentSizeChange = useCallback(
      (event: { nativeEvent: { contentSize: { height: number } } }) => {
        const newHeight = Math.min(
          Math.max(44, event.nativeEvent.contentSize.height),
          120,
        );
        setInputHeight(newHeight);
      },
      [],
    );

    return (
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: palette.glassBorder,
          backgroundColor: palette.void,
        }}
      >
        {/* Model selector */}
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

        {/* Input row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            backgroundColor: palette.glassLow,
            borderRadius: layout.radius.lg,
            borderWidth: 1,
            borderColor: palette.glassBorder,
            paddingLeft: spacing.md,
            paddingRight: spacing.xs,
            paddingVertical: spacing.xs,
          }}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onContentSizeChange={handleContentSizeChange}
            placeholder={placeholder}
            placeholderTextColor={palette.starlightDim}
            multiline
            style={{
              flex: 1,
              height: inputHeight,
              maxHeight: 120,
              fontFamily: typography.body,
              fontSize: 16,
              color: palette.starlight,
              paddingTop: 10,
              paddingBottom: 10,
            }}
            editable={!disabled}
          />

          <AnimatedPressable
            onPress={handleSend}
            disabled={!canSend || isSending}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                isSending || canSend ? palette.roseQuartz : palette.glassLow,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: spacing.xs,
              marginBottom: 4,
              opacity: isSending ? 0.8 : 1,
            }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={palette.void} />
            ) : (
              <Send
                size={18}
                color={canSend ? palette.void : palette.starlightDim}
                style={{ marginLeft: 2 }}
              />
            )}
          </AnimatedPressable>
        </View>
      </View>
    );
  },
);
