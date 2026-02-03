import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useKeyboard, useRenderer } from "@opentui/solid";
import clipboard from "clipboardy";
import { createEffect, createSignal, Show } from "solid-js";
import { useMessages } from "../hooks/useMessages.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import {
  createBookmark,
  sendMessage,
  updateConversationModel,
} from "../lib/mutations.js";
import { type Conversation, getConversation } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { ChatInput } from "./ChatInput.js";
import { HelpModal } from "./HelpModal.js";
import { MessageList } from "./MessageList.js";
import { ModelPicker } from "./ModelPicker.js";
import { Spinner } from "./Spinner.js";

interface ChatViewProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

type ViewState =
  | "loading"
  | "ready"
  | "sending"
  | "error"
  | "model-picker"
  | "help";
type InputMode = "typing" | "command";

export function ChatView(props: ChatViewProps) {
  const renderer = useRenderer();
  const [state, setState] = createSignal<ViewState>("loading");
  const [conversation, setConversation] = createSignal<Conversation | null>(
    null,
  );
  const [error, setError] = createSignal<string | null>(null);
  const [inputMode, setInputMode] = createSignal<InputMode>("typing");
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const [toast, setToast] = createSignal<string | null>(null);

  // Subscribe to messages
  const {
    data: messages,
    error: messagesError,
    isLoading: messagesLoading,
  } = useMessages(() => props.conversationId);

  const isGenerating = () =>
    messages()?.some(
      (m) => m.status === "generating" || m.status === "pending",
    );

  // Load conversation metadata
  createEffect(() => {
    (async () => {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const conv = await getConversation(
          client,
          apiKey,
          props.conversationId,
        );
        if (!conv) {
          setError("Conversation not found or API key invalid");
          setState("error");
          return;
        }
        setConversation(conv);
        setState("ready");
      } catch (err) {
        setError(formatError(err));
        setState("error");
      }
    })();
  });

  // Handle message errors
  createEffect(() => {
    const err = messagesError();
    if (err) {
      setError(formatError(err));
      setState("error");
    }
  });

  // Clear toast after 2s
  createEffect(() => {
    const t = toast();
    if (t) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  });

  // Reset selection in typing mode
  createEffect(() => {
    if (inputMode() === "typing") setSelectedIndex(null);
  });

  const handleSend = async (content: string) => {
    setState("sending");
    setError(null);
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await sendMessage(client, apiKey, {
        conversationId: props.conversationId,
        content,
      });
      setState("ready");
    } catch (err) {
      setError(formatError(err));
      setState("ready");
    }
  };

  const handleModelSelect = async (modelId: string) => {
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await updateConversationModel(
        client,
        apiKey,
        props.conversationId,
        modelId,
      );
      const conv = await getConversation(client, apiKey, props.conversationId);
      if (conv) setConversation(conv);
      setState("ready");
    } catch (err) {
      setError(formatError(err));
      setState("ready");
    }
  };

  const handleCopy = async () => {
    const msgs = messages();
    if (!msgs || msgs.length === 0) {
      setToast(`${symbols.warning} No messages to copy`);
      return;
    }
    const idx = selectedIndex();
    let msgToCopy =
      idx !== null
        ? msgs[idx]
        : [...msgs].reverse().find((m) => m.role === "assistant");
    if (!msgToCopy) msgToCopy = msgs[msgs.length - 1];
    const content = msgToCopy.content || msgToCopy.partialContent || "";
    await clipboard.write(content);
    setToast(`${symbols.success} Copied to clipboard`);
  };

  const handleBookmark = async () => {
    const msgs = messages();
    if (!msgs || msgs.length === 0) {
      setToast(`${symbols.warning} No messages to bookmark`);
      return;
    }
    const idx = selectedIndex();
    let msgToBookmark =
      idx !== null
        ? msgs[idx]
        : [...msgs].reverse().find((m) => m.role === "assistant");
    if (!msgToBookmark) msgToBookmark = msgs[msgs.length - 1];
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await createBookmark(
        client,
        apiKey,
        msgToBookmark._id,
        props.conversationId,
      );
      setToast(`${symbols.success} Bookmarked`);
    } catch (err) {
      setToast(`${symbols.error} ${formatError(err)}`);
    }
  };

  // Keyboard shortcuts
  useKeyboard((evt) => {
    if (state() !== "ready") return;

    if (evt.name === "escape") {
      evt.preventDefault();
      if (inputMode() === "typing") {
        setInputMode("command");
      } else {
        props.onBack();
      }
      return;
    }

    if (inputMode() === "typing") return;

    const msgs = messages();
    const msgCount = msgs?.length ?? 0;

    if ((evt.name === "j" || evt.name === "down") && msgCount > 0) {
      evt.preventDefault();
      const idx = selectedIndex();
      if (idx === null) {
        setSelectedIndex(Math.min(msgCount - 1, msgCount - 1));
      } else {
        setSelectedIndex(Math.min(idx + 1, msgCount - 1));
      }
      return;
    }

    if ((evt.name === "k" || evt.name === "up") && msgCount > 0) {
      evt.preventDefault();
      const idx = selectedIndex();
      if (idx === null) {
        setSelectedIndex(Math.max(0, msgCount - 2));
      } else {
        setSelectedIndex(Math.max(idx - 1, 0));
      }
      return;
    }

    if (evt.name === "g" && !evt.shift && msgCount > 0) {
      evt.preventDefault();
      setSelectedIndex(0);
      return;
    }

    if (evt.shift && evt.name === "g" && msgCount > 0) {
      evt.preventDefault();
      setSelectedIndex(msgCount - 1);
      return;
    }

    if (evt.name === "c") {
      evt.preventDefault();
      handleCopy();
      return;
    }

    if (evt.shift && evt.name === "b") {
      evt.preventDefault();
      handleBookmark();
      return;
    }

    if (evt.name === "b") {
      evt.preventDefault();
      props.onBack();
      return;
    }

    if (evt.name === "q") {
      evt.preventDefault();
      renderer.destroy();
      return;
    }

    if (evt.name === "m" && !isGenerating()) {
      evt.preventDefault();
      setState("model-picker");
      return;
    }

    if (evt.name === "?") {
      evt.preventDefault();
      setState("help");
      return;
    }

    // Any other key returns to typing mode
    if (!evt.ctrl && !evt.meta) {
      setInputMode("typing");
    }
  });

  const totalMessages = () => messages()?.length ?? 0;

  return (
    <box flexDirection="column" padding={1}>
      <Show when={state() === "help"}>
        <HelpModal context="chat" onClose={() => setState("ready")} />
      </Show>

      <Show when={state() === "model-picker"}>
        <ModelPicker
          currentModel={conversation()?.model ?? undefined}
          onSelect={handleModelSelect}
          onCancel={() => setState("ready")}
        />
      </Show>

      <Show when={state() === "loading" || (messagesLoading() && !messages())}>
        <Spinner label="Loading conversation..." />
      </Show>

      <Show when={state() === "error"}>
        <box>
          <text fg="red">
            {symbols.error} {error()}
          </text>
        </box>
        <box marginTop={1}>
          <text fg="gray">Press 'b' to go back or 'q' to quit</text>
        </box>
      </Show>

      <Show when={state() === "ready" || state() === "sending"}>
        {/* Header */}
        <box
          marginBottom={1}
          style={{ border: true, borderColor: "gray" }}
          paddingLeft={1}
          paddingRight={1}
        >
          <text attributes={1}>{conversation()?.title || "Chat"}</text>
          <box flexGrow={1} />
          <text fg="gray">{totalMessages()} messages</text>
        </box>

        {/* Messages */}
        <MessageList
          messages={messages() ?? []}
          selectedIndex={selectedIndex()}
        />

        {/* Toast */}
        <Show when={toast()}>
          <box justifyContent="center" marginBottom={1}>
            <text>{toast()}</text>
          </box>
        </Show>

        {/* Input */}
        <ChatInput
          onSubmit={handleSend}
          onCancel={() => setInputMode("command")}
          isSending={state() === "sending"}
          isDisabled={isGenerating() || inputMode() === "command"}
          placeholder={
            isGenerating()
              ? "Waiting for response..."
              : inputMode() === "command"
                ? "Press any key to type..."
                : "Type a message..."
          }
        />

        {/* Status bar */}
        <box marginTop={1}>
          <text fg="gray">
            {symbols.chevronRight}{" "}
            <Show
              when={inputMode() === "command"}
              fallback={
                <>
                  <text fg="cyan">[TYPE]</text> Esc for commands
                </>
              }
            >
              <text fg="yellow">[CMD]</text> j/k nav | c copy | B bookmark | b
              back | ? help
              <Show when={selectedIndex() !== null}>
                <text fg="cyan">
                  {" "}
                  [{(selectedIndex() ?? 0) + 1}/{totalMessages()}]
                </text>
              </Show>
            </Show>
            <Show when={conversation()?.model}>
              {` | ${conversation()!.model}`}
            </Show>
          </text>
        </box>
      </Show>
    </box>
  );
}
