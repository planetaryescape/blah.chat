import { For, Show } from "solid-js";
import type { Message as MessageType } from "../lib/queries.js";
import { Message } from "./Message.js";

interface MessageListProps {
  messages: MessageType[];
  selectedIndex: number | null;
}

export function MessageList(props: MessageListProps) {
  return (
    <scrollbox flexGrow={1} stickyScroll={true} stickyStart="bottom">
      <Show
        when={props.messages.length > 0}
        fallback={
          <box paddingLeft={2}>
            <text fg="#a1a1aa">No messages yet. Start the conversation!</text>
          </box>
        }
      >
        <For each={props.messages}>
          {(msg, idx) => (
            <Message
              message={msg}
              isHighlighted={props.selectedIndex === idx()}
            />
          )}
        </For>
      </Show>
    </scrollbox>
  );
}
