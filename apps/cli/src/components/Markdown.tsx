import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { createMemo } from "solid-js";

marked.use(markedTerminal());

interface MarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function Markdown(props: MarkdownProps) {
  const rendered = createMemo(() => {
    try {
      const textToRender = props.isStreaming
        ? `${props.content}\u258C`
        : props.content;
      return marked.parse(textToRender, { async: false }) as string;
    } catch {
      return props.content;
    }
  });

  return <text>{rendered()}</text>;
}
