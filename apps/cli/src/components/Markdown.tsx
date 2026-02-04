import { getTreeSitterClient, SyntaxStyle } from "@opentui/core";

const treeSitterClient = getTreeSitterClient();

const defaultStyle = SyntaxStyle.fromTheme([
  {
    scope: ["comment", "comment.documentation"],
    style: { foreground: "#616E88", italic: true },
  },
  {
    scope: [
      "keyword",
      "keyword.conditional",
      "keyword.repeat",
      "keyword.return",
      "keyword.function",
      "keyword.exception",
      "keyword.import",
      "keyword.type",
      "keyword.modifier",
      "keyword.coroutine",
      "keyword.operator",
      "keyword.directive",
    ],
    style: { foreground: "#9d7cd8" },
  },
  {
    scope: [
      "function",
      "function.method",
      "function.call",
      "function.method.call",
      "function.builtin",
      "constructor",
    ],
    style: { foreground: "#7aa2f7" },
  },
  { scope: ["variable"], style: { foreground: "#c0caf5" } },
  {
    scope: ["variable.builtin", "variable.parameter"],
    style: { foreground: "#e0af68" },
  },
  {
    scope: ["variable.member", "property"],
    style: { foreground: "#73daca" },
  },
  {
    scope: ["string", "string.escape", "string.special"],
    style: { foreground: "#9ece6a" },
  },
  { scope: ["string.regexp"], style: { foreground: "#b4f9f8" } },
  { scope: ["number", "boolean"], style: { foreground: "#ff9e64" } },
  {
    scope: ["constant", "constant.builtin"],
    style: { foreground: "#ff9e64" },
  },
  { scope: ["type", "type.builtin"], style: { foreground: "#2ac3de" } },
  { scope: ["operator"], style: { foreground: "#89ddff" } },
  {
    scope: [
      "punctuation.delimiter",
      "punctuation.bracket",
      "punctuation.special",
    ],
    style: { foreground: "#a9b1d6" },
  },
  { scope: ["attribute"], style: { foreground: "#bb9af7" } },
  { scope: ["module"], style: { foreground: "#7aa2f7" } },
  { scope: ["label"], style: { foreground: "#7aa2f7" } },
  {
    scope: ["string.special.url"],
    style: { foreground: "#73daca", underline: true },
  },
]);

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function Markdown(props: MarkdownProps) {
  return (
    <markdown
      syntaxStyle={defaultStyle}
      treeSitterClient={treeSitterClient}
      streaming={props.isStreaming ?? false}
      content={props.content}
    />
  );
}
