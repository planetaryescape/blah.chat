import Clipboard from "@react-native-clipboard/clipboard";
import { toast } from "burnt";
import { Check, Copy } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import SyntaxHighlighter from "react-native-syntax-highlighter";
import { layout, palette, spacing } from "@/lib/theme/designSystem";

// Custom dark theme matching our design system (Atom One Dark inspired)
// react-native-syntax-highlighter uses hljs internally
const customDarkStyle: Record<string, Record<string, string>> = {
  hljs: {
    background: palette.obsidian,
    color: "#abb2bf",
  },
  "hljs-keyword": { color: "#c678dd" },
  "hljs-built_in": { color: "#e6c07b" },
  "hljs-type": { color: "#e6c07b" },
  "hljs-literal": { color: "#56b6c2" },
  "hljs-number": { color: "#d19a66" },
  "hljs-operator": { color: "#56b6c2" },
  "hljs-punctuation": { color: "#abb2bf" },
  "hljs-property": { color: "#e06c75" },
  "hljs-regex": { color: "#98c379" },
  "hljs-string": { color: "#98c379" },
  "hljs-char": { color: "#98c379" },
  "hljs-symbol": { color: "#61aeee" },
  "hljs-name": { color: "#e06c75" },
  "hljs-variable": { color: "#e06c75" },
  "hljs-template-variable": { color: "#e06c75" },
  "hljs-comment": { color: "#5c6370" },
  "hljs-doctag": { color: "#c678dd" },
  "hljs-attr": { color: "#d19a66" },
  "hljs-attribute": { color: "#98c379" },
  "hljs-function": { color: "#61aeee" },
  "hljs-title": { color: "#61aeee" },
  "hljs-params": { color: "#abb2bf" },
  "hljs-class": { color: "#e6c07b" },
  "hljs-tag": { color: "#e06c75" },
  "hljs-selector-tag": { color: "#e06c75" },
  "hljs-selector-id": { color: "#61aeee" },
  "hljs-selector-class": { color: "#d19a66" },
  "hljs-addition": { color: "#98c379" },
  "hljs-deletion": { color: "#e06c75" },
};

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
          style={customDarkStyle}
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
