import Clipboard from "@react-native-clipboard/clipboard";
import { toast } from "burnt";
import { Check, Copy } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import SyntaxHighlighter from "react-native-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { layout, palette, spacing } from "@/lib/theme/designSystem";

interface CodeBlockProps {
  code: string;
  language?: string;
}

const languageMap: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  yml: "yaml",
  md: "markdown",
};

function normalizeLanguage(lang?: string): string {
  if (!lang) return "text";
  const lower = lang.toLowerCase();
  return languageMap[lower] || lower;
}

function CodeBlockComponent({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const normalizedLang = normalizeLanguage(language);

  const handleCopy = async () => {
    Clipboard.setString(code);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      preset: "done",
      haptic: "success",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View
      style={{
        backgroundColor: palette.obsidian,
        borderRadius: layout.radius.sm,
        marginVertical: spacing.sm,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: palette.glassBorder,
        }}
      >
        <Text
          style={{
            fontFamily: "Courier",
            fontSize: 11,
            color: palette.starlightDim,
          }}
        >
          {normalizedLang}
        </Text>
        <Pressable
          onPress={handleCopy}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: spacing.xs,
          })}
        >
          {copied ? (
            <Check size={16} color={palette.success} />
          ) : (
            <Copy size={16} color={palette.starlightDim} />
          )}
        </Pressable>
      </View>

      {/* Code */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 400 }}
        contentContainerStyle={{ padding: spacing.md }}
      >
        <SyntaxHighlighter
          language={normalizedLang}
          style={atomOneDark}
          highlighter="hljs"
          customStyle={{
            backgroundColor: "transparent",
            padding: 0,
            margin: 0,
          }}
          fontFamily="Courier"
          fontSize={13}
        >
          {code}
        </SyntaxHighlighter>
      </ScrollView>
    </View>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
