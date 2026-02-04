import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useKeyboard } from "@opentui/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useListNavigation } from "../hooks/useListNavigation.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { archiveConversation, deleteConversation } from "../lib/mutations.js";
import { type Conversation, listConversations } from "../lib/queries.js";
import { formatRelativeTime, symbols } from "../lib/terminal.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { HelpModal } from "./HelpModal.js";
import { Spinner } from "./Spinner.js";

interface ConversationListProps {
  onSelect: (conversationId: Id<"conversations">) => void;
  onNewConversation?: () => void;
  onSearch?: () => void;
  onQuit: () => void;
}

type ViewState = "loading" | "ready" | "error";
type DialogState = "none" | "archive" | "delete";

export function ConversationList(props: ConversationListProps) {
  const [state, setState] = createSignal<ViewState>("loading");
  const [conversations, setConversations] = createSignal<Conversation[]>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [dialog, setDialog] = createSignal<DialogState>("none");
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [showHelp, setShowHelp] = createSignal(false);

  const refreshConversations = async () => {
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      const convos = await listConversations(client, apiKey, { limit: 50 });
      if (!convos) {
        setError("API key invalid or revoked. Run: blah login");
        setState("error");
        return;
      }
      setConversations(convos);
      setState("ready");
    } catch (err) {
      setError(formatError(err));
      setState("error");
    }
  };

  createEffect(() => {
    refreshConversations();
  });

  const { selectedIndex, selectedItem } = useListNavigation({
    items: conversations,
    onSelect: (conv) => props.onSelect(conv._id),
    onCancel: () => props.onQuit(),
    isActive: () => state() === "ready" && dialog() === "none" && !showHelp(),
  });

  const handleArchive = async () => {
    const item = selectedItem();
    if (!item) return;
    setIsProcessing(true);
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await archiveConversation(client, apiKey, item._id);
      await refreshConversations();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
      setDialog("none");
    }
  };

  const handleDelete = async () => {
    const item = selectedItem();
    if (!item) return;
    setIsProcessing(true);
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await deleteConversation(client, apiKey, item._id);
      await refreshConversations();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
      setDialog("none");
    }
  };

  // Additional key handlers
  useKeyboard((evt) => {
    if (
      state() !== "ready" ||
      dialog() !== "none" ||
      isProcessing() ||
      showHelp()
    )
      return;

    if (evt.name === "?") {
      evt.preventDefault();
      setShowHelp(true);
      return;
    }
    if (evt.name === "n" && props.onNewConversation) {
      evt.preventDefault();
      props.onNewConversation();
      return;
    }
    if (evt.name === "/" && props.onSearch) {
      evt.preventDefault();
      props.onSearch();
      return;
    }
    if (evt.name === "a" && selectedItem()) {
      evt.preventDefault();
      setDialog("archive");
      return;
    }
    if (evt.name === "d" && selectedItem()) {
      evt.preventDefault();
      setDialog("delete");
      return;
    }
  });

  // Window calculations
  const windowSize = 15;
  const startIndex = createMemo(() => {
    const half = Math.floor(windowSize / 2);
    return Math.max(0, selectedIndex() - half);
  });
  const endIndex = createMemo(() =>
    Math.min(conversations().length, startIndex() + windowSize),
  );
  const visibleConversations = createMemo(() =>
    conversations().slice(startIndex(), endIndex()),
  );

  return (
    <box flexDirection="column" padding={1}>
      <Show when={state() === "loading"}>
        <Spinner label="Loading conversations..." />
      </Show>

      <Show when={state() === "error"}>
        <box>
          <text fg="red">
            {symbols.error} {error()}
          </text>
        </box>
        <box marginTop={1}>
          <text fg="gray">Press 'q' to quit</text>
        </box>
      </Show>

      <Show when={showHelp()}>
        <HelpModal context="list" onClose={() => setShowHelp(false)} />
      </Show>

      <Show when={dialog() === "archive" && selectedItem()}>
        <ConfirmDialog
          title="Archive Conversation"
          message={`Archive "${selectedItem()?.title || "Untitled"}"? It will be hidden from the list.`}
          confirmLabel="Archive"
          cancelLabel="Cancel"
          isDestructive={false}
          onConfirm={handleArchive}
          onCancel={() => setDialog("none")}
        />
      </Show>

      <Show when={dialog() === "delete" && selectedItem()}>
        <ConfirmDialog
          title="Delete Conversation"
          message={`Permanently delete "${selectedItem()?.title || "Untitled"}" and all its messages? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          isDestructive={true}
          onConfirm={handleDelete}
          onCancel={() => setDialog("none")}
        />
      </Show>

      <Show when={isProcessing()}>
        <Spinner label="Processing..." />
      </Show>

      <Show
        when={
          state() === "ready" &&
          !showHelp() &&
          dialog() === "none" &&
          !isProcessing()
        }
      >
        <Show
          when={conversations().length > 0}
          fallback={
            <box flexDirection="column">
              <box marginBottom={1}>
                <text attributes={1}>Conversations</text>
              </box>
              <box>
                <text fg="gray">No conversations yet</text>
              </box>
              <box marginTop={1}>
                <text fg="gray">
                  {props.onNewConversation
                    ? "Press 'n' to create a new conversation"
                    : "Create a conversation on the web to get started."}
                </text>
              </box>
              <box marginTop={1}>
                <text fg="gray">Press 'q' to quit</text>
              </box>
            </box>
          }
        >
          {/* Header */}
          <box
            flexDirection="row"
            marginBottom={1}
            style={{ border: true, borderColor: "gray" }}
            paddingLeft={1}
            paddingRight={1}
          >
            <text attributes={1}>Conversations</text>
            <box flexGrow={1} />
            <text fg="gray">{`(${conversations().length})`}</text>
          </box>

          {/* Scroll top (always rendered to prevent layout shift) */}
          <box justifyContent="center">
            <text fg="gray">
              {startIndex() > 0 ? `\u2191 ${startIndex()} more` : " "}
            </text>
          </box>

          {/* List */}
          <box flexDirection="column">
            <For each={visibleConversations()}>
              {(conv, i) => {
                const actualIndex = () => startIndex() + i();
                const isSelected = () => actualIndex() === selectedIndex();
                const title = () => conv.title || "Untitled";
                const truncatedTitle = () =>
                  title().length > 35 ? `${title().slice(0, 35)}...` : title();
                const messageCount = () => conv.messageCount || 0;
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
                      {` (${messageCount()}) `}
                    </text>
                    <text fg={isSelected() ? "black" : "gray"}>
                      {relTime()}
                    </text>
                  </box>
                );
              }}
            </For>
          </box>

          {/* Scroll bottom (always rendered to prevent layout shift) */}
          <box justifyContent="center">
            <text fg="gray">
              {endIndex() < conversations().length
                ? `\u2193 ${conversations().length - endIndex()} more`
                : " "}
            </text>
          </box>

          {/* Help bar */}
          <box
            flexDirection="row"
            marginTop={1}
            style={{ border: true, borderColor: "gray" }}
            paddingLeft={1}
            paddingRight={1}
          >
            <text fg="gray">
              {symbols.chevronRight} {"\u2191\u2193"}/jk nav | Enter open |{" "}
              {props.onSearch ? "/ search | " : ""}
              {props.onNewConversation ? "n new | " : ""}a archive | d delete |
              ? help | q quit
            </text>
          </box>
        </Show>
      </Show>
    </box>
  );
}
