import { Show } from "solid-js";
import type { Message as MessageType } from "../lib/queries.js";
import { formatRelativeTime, formatTTFT } from "../lib/terminal.js";
import { Markdown } from "./Markdown.js";
import { Spinner } from "./Spinner.js";

interface MessageProps {
  message: MessageType;
  isHighlighted?: boolean;
}

interface RoleStyle {
  icon: string;
  label: string;
  color: string;
}

const roleStyles: Record<string, RoleStyle> = {
  user: { icon: "\u{1F464}", label: "You", color: "cyan" },
  assistant: { icon: "\u{1F916}", label: "Assistant", color: "green" },
  system: { icon: "\u2699\uFE0F", label: "System", color: "gray" },
};

export function Message(props: MessageProps) {
  const style = () => roleStyles[props.message.role] || roleStyles.system;
  const isGenerating = () => props.message.status === "generating";
  const isError = () => props.message.status === "error";
  const isPending = () => props.message.status === "pending";

  const displayContent = () =>
    isGenerating()
      ? props.message.partialContent || "..."
      : props.message.content;

  const timestamp = () => formatRelativeTime(props.message.createdAt);

  return (
    <box
      flexDirection="column"
      marginBottom={1}
      paddingLeft={props.isHighlighted ? 1 : 0}
      style={props.isHighlighted ? { border: true, borderColor: "blue" } : {}}
    >
      {/* Header */}
      <box flexDirection="row">
        <text fg={style().color}>
          {style().icon} {style().label}
        </text>
        <box flexGrow={1} />
        <Show when={isGenerating() || isPending()}>
          <box marginRight={1}>
            <Spinner color="yellow" />
            <text fg="yellow">
              {isPending() ? " waiting..." : " generating..."}
            </text>
          </box>
        </Show>
        <Show when={isError()}>
          <text fg="red">error</text>
        </Show>
        <text fg="gray"> {timestamp()}</text>
      </box>

      {/* Content */}
      <box marginLeft={3}>
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

      {/* Stats for assistant messages */}
      <Show when={props.message.role === "assistant"}>
        <box marginLeft={3} gap={2}>
          <text fg="gray">
            {props.message.model
              ? props.message.model.split(":")[1] || props.message.model
              : "(no model)"}
          </text>
          <Show when={props.message.status === "complete"}>
            <Show
              when={
                props.message.firstTokenAt && props.message.generationStartedAt
              }
            >
              <text fg="gray">
                TTFT:{" "}
                {formatTTFT(
                  props.message.firstTokenAt! -
                    props.message.generationStartedAt!,
                )}
              </text>
            </Show>
            <Show when={props.message.tokensPerSecond}>
              <text fg="gray">
                {Math.round(props.message.tokensPerSecond!)} t/s
              </text>
            </Show>
            <Show
              when={props.message.inputTokens || props.message.outputTokens}
            >
              <text fg="gray">
                {props.message.inputTokens || 0}/
                {props.message.outputTokens || 0}
              </text>
            </Show>
          </Show>
        </box>
      </Show>
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
      <text fg={style().color}>{style().icon} </text>
      <text fg="gray">{truncated().replace(/\n/g, " ")}</text>
    </box>
  );
}
