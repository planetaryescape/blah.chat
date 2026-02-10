import type { BoxRenderable, ScrollBoxRenderable } from "@opentui/core";
import { createEffect, For, Show } from "solid-js";
import type { Message as MessageType } from "../lib/queries.js";
import { Message } from "./Message.js";

interface MessageListProps {
  messages: MessageType[];
  selectedIndex: number | null;
  pinnedMessageId?: string;
}

export function MessageList(props: MessageListProps) {
  let scrollRef: ScrollBoxRenderable | undefined;
  const messageBoxesById = new Map<string, BoxRenderable>();
  let didInitialScroll = false;
  let lastPinnedApplied: string | null = null;

  createEffect(() => {
    // Track list length reactively
    const len = props.messages.length;
    const pinned = props.pinnedMessageId;
    if (!scrollRef) return;

    // Initial open: scroll to bottom once.
    if (!didInitialScroll && len > 0 && !pinned) {
      didInitialScroll = true;
      scrollRef.scrollTop = Math.max(
        0,
        scrollRef.scrollHeight - scrollRef.viewport.height,
      );
      return;
    }

    // On send: pin the just-sent user message to the top.
    if (pinned && pinned !== lastPinnedApplied) {
      const box = messageBoxesById.get(pinned);
      if (!box) return;

      didInitialScroll = true;
      lastPinnedApplied = pinned;

      const maxScrollTop = Math.max(
        0,
        scrollRef.scrollHeight - scrollRef.viewport.height,
      );
      const target = Math.max(
        0,
        Math.min(maxScrollTop, box.y - scrollRef.viewport.y),
      );
      scrollRef.scrollTop = target;
    }
  });

  return (
    <scrollbox
      ref={(r: ScrollBoxRenderable) => {
        scrollRef = r;
      }}
      flexGrow={1}
      stickyScroll={false}
    >
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
            <box
              ref={(r: BoxRenderable) => {
                messageBoxesById.set(String(msg._id), r);
              }}
            >
              <Message
                message={msg}
                isHighlighted={props.selectedIndex === idx()}
              />
            </box>
          )}
        </For>
      </Show>
    </scrollbox>
  );
}
