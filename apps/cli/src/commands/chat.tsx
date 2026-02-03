import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { render, useRenderer } from "@opentui/solid";
import { createSignal, Show } from "solid-js";
import { ChatView } from "../components/ChatView.js";
import { ConversationList } from "../components/ConversationList.js";
import { SearchModal } from "../components/SearchModal.js";
import { Spinner } from "../components/Spinner.js";
import { getCredentials } from "../lib/auth.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { createConversation } from "../lib/mutations.js";
import { getUserDefaultModel } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { ConvexProvider } from "../providers/ConvexProvider.js";
import { KeybindProvider } from "../providers/KeybindProvider.js";
import { ThemeProvider } from "../providers/ThemeProvider.js";

type View = "list" | "chat" | "search" | "creating";

function ChatApp() {
  const renderer = useRenderer();
  const [view, setView] = createSignal<View>("list");
  const [selectedConversationId, setSelectedConversationId] =
    createSignal<Id<"conversations"> | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const handleSelectConversation = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  };

  const handleBack = () => {
    setView("list");
    setSelectedConversationId(null);
    setError(null);
  };

  const handleNewConversation = async () => {
    setView("creating");
    setError(null);
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      const defaultModel = await getUserDefaultModel(client, apiKey);
      const result = await createConversation(client, apiKey, {
        title: "New Chat",
        model: defaultModel,
      });
      setSelectedConversationId(result.conversationId);
      setView("chat");
    } catch (err) {
      setError(formatError(err));
      setView("list");
    }
  };

  const handleSearch = () => setView("search");
  const handleQuit = () => renderer.destroy();

  return (
    <box flexDirection="column">
      <Show when={error()}>
        <box padding={1}>
          <text fg="red">
            {symbols.error} {error()}
          </text>
        </box>
      </Show>

      <Show when={view() === "search"}>
        <SearchModal
          onSelect={handleSelectConversation}
          onCancel={handleBack}
        />
      </Show>

      <Show when={view() === "creating"}>
        <box padding={1}>
          <Spinner label="Creating new conversation..." />
        </box>
      </Show>

      <Show when={view() === "chat" && selectedConversationId()}>
        <ChatView
          conversationId={selectedConversationId()!}
          onBack={handleBack}
        />
      </Show>

      <Show when={view() === "list"}>
        <ConversationList
          onSelect={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onSearch={handleSearch}
          onQuit={handleQuit}
        />
      </Show>
    </box>
  );
}

export async function runChatCommand() {
  const credentials = getCredentials();
  if (!credentials) {
    console.log(`${symbols.warning} Not logged in`);
    console.log("  Run: blah login");
    return;
  }

  await render(
    () => (
      <ThemeProvider>
        <ConvexProvider>
          <KeybindProvider>
            <ChatApp />
          </KeybindProvider>
        </ConvexProvider>
      </ThemeProvider>
    ),
    {
      targetFps: 60,
      exitOnCtrlC: false,
    },
  );
}
