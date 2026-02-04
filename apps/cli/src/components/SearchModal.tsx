import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useKeyboard } from "@opentui/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useFuzzySearch } from "../hooks/useFuzzySearch.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { type Conversation, listConversations } from "../lib/queries.js";
import { formatRelativeTime, symbols } from "../lib/terminal.js";
import { Spinner } from "./Spinner.js";

interface SearchModalProps {
  onSelect: (conversationId: Id<"conversations">) => void;
  onCancel: () => void;
}

export function SearchModal(props: SearchModalProps) {
  const [conversations, setConversations] = createSignal<Conversation[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const { setQuery, results, isSearching } = useFuzzySearch({
    items: conversations,
    getSearchText: (conv) => conv.title || "Untitled",
  });

  // Load conversations
  createEffect(() => {
    (async () => {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const convos = await listConversations(client, apiKey, { limit: 100 });
        if (convos) setConversations(convos);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setIsLoading(false);
      }
    })();
  });

  // Reset selection when results change
  createEffect(() => {
    results();
    setSelectedIndex(0);
  });

  useKeyboard((evt) => {
    if (isLoading()) return;

    if (evt.name === "down" || (evt.ctrl && evt.name === "n")) {
      evt.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results().length - 1));
      return;
    }
    if (evt.name === "up" || (evt.ctrl && evt.name === "p")) {
      evt.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (evt.name === "return") {
      evt.preventDefault();
      const selected = results()[selectedIndex()];
      if (selected) props.onSelect(selected._id);
      return;
    }
    if (evt.name === "escape") {
      evt.preventDefault();
      props.onCancel();
      return;
    }
  });

  // Window calculations
  const windowSize = 8;
  const startIndex = createMemo(() => {
    const half = Math.floor(windowSize / 2);
    return Math.max(0, selectedIndex() - half);
  });
  const endIndex = createMemo(() =>
    Math.min(results().length, startIndex() + windowSize),
  );
  const visibleResults = createMemo(() =>
    results().slice(startIndex(), endIndex()),
  );

  return (
    <box flexDirection="column" padding={1}>
      <Show when={isLoading()}>
        <Spinner label="Loading conversations..." />
      </Show>

      <Show when={error()}>
        <box>
          <text fg="red">
            {symbols.error} {error()}
          </text>
        </box>
        <box marginTop={1}>
          <text fg="gray">Press Escape to go back</text>
        </box>
      </Show>

      <Show when={!isLoading() && !error()}>
        {/* Header */}
        <box
          marginBottom={1}
          style={{ border: true, borderColor: "cyan" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="cyan" attributes={1}>
            Search Conversations
          </text>
          <box flexGrow={1} />
          <text fg="gray">{`${results().length} results`}</text>
        </box>

        {/* Search input */}
        <box marginBottom={1}>
          <text fg="cyan">{symbols.chevronRight} </text>
          <input
            onInput={(e: string) => setQuery(e)}
            placeholder="Type to search..."
            ref={(r: any) => {
              setTimeout(() => {
                if (r && !r.isDestroyed) r.focus();
              }, 1);
            }}
          />
        </box>

        {/* Results */}
        <Show
          when={results().length > 0}
          fallback={
            <box paddingLeft={1}>
              <text fg="gray">
                {isSearching() ? "No matches found" : "No conversations"}
              </text>
            </box>
          }
        >
          <box justifyContent="center">
            <text fg="gray">
              {startIndex() > 0
                ? `${symbols.arrowUp} ${startIndex()} more`
                : " "}
            </text>
          </box>

          <box flexDirection="column">
            <For each={visibleResults()}>
              {(conv, i) => {
                const actualIndex = () => startIndex() + i();
                const isSelected = () => actualIndex() === selectedIndex();
                const title = () => conv.title || "Untitled";
                const truncatedTitle = () =>
                  title().length > 40 ? `${title().slice(0, 40)}...` : title();
                const relTime = () =>
                  formatRelativeTime(conv.lastMessageAt || conv.createdAt);

                return (
                  <box
                    flexDirection="row"
                    paddingLeft={1}
                    paddingRight={1}
                    backgroundColor={isSelected() ? "cyan" : undefined}
                  >
                    <text
                      fg={isSelected() ? "black" : undefined}
                      attributes={isSelected() ? 1 : 0}
                    >
                      {truncatedTitle()}
                    </text>
                    <text fg={isSelected() ? "black" : "gray"}>
                      {" "}
                      ({conv.messageCount || 0}) {relTime()}
                    </text>
                  </box>
                );
              }}
            </For>
          </box>

          <box justifyContent="center">
            <text fg="gray">
              {endIndex() < results().length
                ? `${symbols.arrowDown} ${results().length - endIndex()} more`
                : " "}
            </text>
          </box>
        </Show>

        {/* Help bar */}
        <box
          marginTop={1}
          style={{ border: true, borderColor: "gray" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg="gray">
            {symbols.chevronRight} {"\u2191\u2193"} navigate | Enter select |
            Esc cancel
          </text>
        </box>
      </Show>
    </box>
  );
}
