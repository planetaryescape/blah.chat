import { Show } from "solid-js";
import type { Message as MessageType } from "../lib/queries.js";
import { formatTTFT } from "../lib/terminal.js";
import { Markdown } from "./Markdown.js";
import { Spinner } from "./Spinner.js";

interface MessageProps {
  message: MessageType;
  isHighlighted?: boolean;
}

interface RoleStyle {
  label: string;
  borderColor: string;
  backgroundColor?: string;
}

const roleStyles: Record<string, RoleStyle> = {
  user: { label: "You", borderColor: "#60a5fa", backgroundColor: "#252035" },
  assistant: { label: "Assistant", borderColor: "#F4E0DC" },
  system: { label: "System", borderColor: "#a1a1aa" },
};

export function Message(props: MessageProps) {
  const style = () => roleStyles[props.message.role] || roleStyles.system;
  const isUser = () => props.message.role === "user";
  const isGenerating = () => props.message.status === "generating";
  const isError = () => props.message.status === "error";
  const isPending = () => props.message.status === "pending";

  const displayContent = () =>
    isGenerating()
      ? props.message.partialContent || "..."
      : props.message.content;

  const borderColor = () => style().borderColor;

  const showStats = () =>
    props.message.role === "assistant" && props.message.status === "complete";

  const statsLine = () => {
    const parts: string[] = [];
    const model = props.message.model
      ? props.message.model.split(":")[1] || props.message.model
      : null;
    if (model) parts.push(model);
    if (props.message.firstTokenAt && props.message.generationStartedAt) {
      parts.push(
        `TTFT: ${formatTTFT(props.message.firstTokenAt - props.message.generationStartedAt)}`,
      );
    }
    if (props.message.tokensPerSecond) {
      parts.push(`${Math.round(props.message.tokensPerSecond)} t/s`);
    }
    if (props.message.inputTokens || props.message.outputTokens) {
      parts.push(
        `${props.message.inputTokens || 0}/${props.message.outputTokens || 0} tokens`,
      );
    }
    return parts.join(" \u00B7 ");
  };

  return (
    <box
      flexDirection="column"
      marginTop={1}
      alignItems={isUser() ? "flex-end" : "stretch"}
    >
      <box
        flexDirection="column"
        paddingLeft={2}
        paddingRight={isUser() ? 2 : 0}
        paddingTop={1}
        paddingBottom={1}
        style={{
          border: [isUser() ? "right" : "left"] as any,
          borderStyle: "heavy",
          borderColor: borderColor(),
          ...(props.isHighlighted
            ? { backgroundColor: "#3d3555" }
            : style().backgroundColor
              ? { backgroundColor: style().backgroundColor }
              : {}),
        }}
      >
        {/* Header: role label + status */}
        <box
          flexDirection="row"
          justifyContent={isUser() ? "flex-end" : "flex-start"}
        >
          <text fg={borderColor()} attributes={1}>
            {style().label}
          </text>
          <Show when={isGenerating() || isPending()}>
            <text> </text>
            <Spinner color="yellow" />
            <text fg="yellow">
              {isPending() ? " waiting..." : " generating..."}
            </text>
          </Show>
          <Show when={isError()}>
            <text fg="red"> error</text>
          </Show>
        </box>

        {/* Content */}
        <box marginTop={1}>
          <Show
            when={!isError()}
            fallback={
              <text fg="red">{props.message.error || displayContent()}</text>
            }
          >
            <Markdown
              content={displayContent()}
              isStreaming={isGenerating() || isPending()}
            />
          </Show>
        </box>

        {/* Stats: single line for complete assistant messages */}
        <Show when={showStats()}>
          <box
            marginTop={1}
            justifyContent={isUser() ? "flex-end" : "flex-start"}
          >
            <text fg="#a1a1aa">{statsLine()}</text>
          </box>
        </Show>
      </box>
    </box>
  );
}

interface CompactMessageProps {
  message: MessageType;
  maxLength?: number;
}

export function CompactMessage(props: CompactMessageProps) {
  const style = () => roleStyles[props.message.role] || roleStyles.system;
  const content = () =>
    props.message.content || props.message.partialContent || "";
  const maxLen = () => props.maxLength ?? 60;
  const truncated = () => {
    const c = content();
    return c.length > maxLen() ? `${c.slice(0, maxLen())}...` : c;
  };

  return (
    <box>
      <text fg={style().borderColor}>{style().label}: </text>
      <text fg="gray">{truncated().replace(/\n/g, " ")}</text>
    </box>
  );
}
