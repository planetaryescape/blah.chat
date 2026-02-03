import { createMemo, For, Show } from "solid-js";
import type { Message as MessageType } from "../lib/queries.js";
import { Message } from "./Message.js";

interface MessageListProps {
  messages: MessageType[];
  selectedIndex: number | null;
  windowSize?: number;
}

export function MessageList(props: MessageListProps) {
  const windowSize = () => props.windowSize ?? 8;
  const totalMessages = () => props.messages.length;
  const maxScroll = () => Math.max(0, totalMessages() - windowSize());

  const startIdx = createMemo(() => {
    if (props.selectedIndex === null) return maxScroll();
    const margin = 2;
    return Math.max(0, Math.min(props.selectedIndex - margin, maxScroll()));
  });

  const visibleMessages = createMemo(() =>
    props.messages.slice(startIdx(), startIdx() + windowSize()),
  );
  const hiddenAbove = () => startIdx();
  const hiddenBelow = () =>
    Math.max(0, totalMessages() - startIdx() - windowSize());

  return (
    <box flexDirection="column" marginBottom={1}>
      {/* Hidden above */}
      <Show when={hiddenAbove() > 0}>
        <box justifyContent="center" marginBottom={1}>
          <text fg="gray">
            {"\u2191"} {hiddenAbove()} older messages
          </text>
        </box>
      </Show>

      {/* Messages */}
      <Show
        when={visibleMessages().length > 0}
        fallback={
          <box>
            <text fg="gray">No messages yet. Start the conversation!</text>
          </box>
        }
      >
        <For each={visibleMessages()}>
          {(msg, idx) => (
            <Message
              message={msg}
              isHighlighted={props.selectedIndex === startIdx() + idx()}
            />
          )}
        </For>
      </Show>

      {/* Hidden below */}
      <Show when={hiddenBelow() > 0}>
        <box justifyContent="center" marginBottom={1}>
          <text fg="gray">
            {"\u2193"} {hiddenBelow()} newer messages
          </text>
        </box>
      </Show>
    </box>
  );
}
