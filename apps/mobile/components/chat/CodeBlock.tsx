import Clipboard from "@react-native-clipboard/clipboard";
import { toast } from "burnt";
import { Check, Copy } from "lucide-react-native";
import { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import CodeHighlighter from "react-native-code-highlighter";
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
  if (!lang) return "plaintext";
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

      {/* Code with syntax highlighting */}
      <CodeHighlighter
        hljsStyle={atomOneDark}
        language={normalizedLang}
        textStyle={{
          fontFamily: "Courier",
          fontSize: 13,
          lineHeight: 20,
        }}
        scrollViewProps={{
          horizontal: true,
          showsHorizontalScrollIndicator: false,
          contentContainerStyle: {
            padding: spacing.md,
            minWidth: "100%",
          },
          style: {
            maxHeight: 400,
          },
        }}
      >
        {code}
      </CodeHighlighter>
    </View>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
