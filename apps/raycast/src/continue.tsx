import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  type Conversation,
  listConversations,
  listMessages,
  listModels,
  type Message,
  type Model,
  sendMessage,
} from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

type View = "list" | "chat" | "input";

export default function ContinueCommand() {
  const [view, setView] = useState<View>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    async function load() {
      try {
        const client = getClient();
        const apiKey = getApiKey();

        const [convoList, modelList] = await Promise.all([
          listConversations(client, apiKey, { limit: 50 }),
          listModels(client, apiKey),
        ]);

        if (convoList) setConversations(convoList);
        if (modelList) setModels(modelList);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load conversations",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function selectConversation(convo: Conversation) {
    setSelectedConvo(convo);
    setIsLoading(true);
    setView("chat");

    try {
      const client = getClient();
      const apiKey = getApiKey();
      const msgs = await listMessages(client, apiKey, convo._id);
      if (msgs) setMessages(msgs);
    } catch (_error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load messages",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage(values: { message: string; model: string }) {
    if (!values.message.trim() || !selectedConvo) return;

    setIsGenerating(true);
    setView("chat");

    try {
      const client = getClient();
      const apiKey = getApiKey();

      await sendMessage(client, apiKey, {
        conversationId: selectedConvo._id,
        content: values.message,
        modelId: values.model || selectedConvo.model || undefined,
      });

      // Poll for completion
      await pollForCompletion(selectedConvo._id);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to send message",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function pollForCompletion(convoId: string) {
    const client = getClient();
    const apiKey = getApiKey();
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const msgs = await listMessages(client, apiKey, convoId);
      if (msgs) {
        setMessages(msgs);

        const last = msgs[msgs.length - 1];
        if (
          last?.role === "assistant" &&
          (last.status === "complete" ||
            last.status === "error" ||
            last.status === "stopped")
        ) {
          return;
        }
      }

      attempts++;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  function formatMarkdown(): string {
    if (messages.length === 0) return "*No messages yet*";

    let lastUser: Message | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        lastUser = messages[i];
        break;
      }
    }

    let lastAssistant: Message | undefined;
    if (lastUser) {
      const userIndex = messages.indexOf(lastUser);
      for (let i = userIndex + 1; i < messages.length; i++) {
        if (messages[i]?.role === "assistant") lastAssistant = messages[i];
      }
    }

    if (!lastAssistant) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "assistant") {
          lastAssistant = messages[i];
          break;
        }
      }
    }

    const userContent = lastUser?.content || "_No user message_";
    const assistantContent =
      lastAssistant?.content ||
      lastAssistant?.partialContent ||
      "_Generating..._";

    return `**You**\n\n${userContent}\n\n---\n\n**Assistant**\n\n${assistantContent}`;
  }

  // Conversation list view
  if (view === "list") {
    return (
      <List isLoading={isLoading}>
        {conversations.map((convo) => (
          <List.Item
            key={String(convo._id)}
            title={convo.title || "New Chat"}
            subtitle={convo.model || undefined}
            accessories={[
              { text: `${convo.messageCount || 0} messages` },
              ...(convo.pinned ? [{ icon: "📌" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Chat"
                  onAction={() => selectConversation(convo)}
                />
                <Action
                  title="Open in Browser"
                  onAction={() => open(`https://blah.chat/chat/${convo._id}`)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Input form view
  if (view === "input") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Send" onSubmit={handleSendMessage} />
            <Action title="Back to Chat" onAction={() => setView("chat")} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="message"
          title="Message"
          placeholder="Type your message..."
          autoFocus
        />
        <Form.Dropdown
          id="model"
          title="Model"
          defaultValue={selectedConvo?.model || "openai:gpt-4o"}
        >
          {models.map((model) => (
            <Form.Dropdown.Item
              key={model.id}
              value={model.id}
              title={`${model.name}${model.isPro ? " (Pro)" : ""}`}
            />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }

  // Chat detail view
  return (
    <Detail
      isLoading={isLoading || isGenerating}
      navigationTitle={selectedConvo?.title || "Chat"}
      markdown={formatMarkdown()}
      actions={
        <ActionPanel>
          <Action title="Send Message" onAction={() => setView("input")} />
          <Action
            title="Copy Last Response"
            onAction={() => {
              const lastAssistant = [...messages]
                .reverse()
                .find((m) => m.role === "assistant");
              if (lastAssistant?.content) {
                Clipboard.copy(lastAssistant.content);
                showToast({ style: Toast.Style.Success, title: "Copied!" });
              }
            }}
          />
          <Action title="Back to List" onAction={() => setView("list")} />
          {selectedConvo && (
            <Action
              title="Open in Browser"
              onAction={() =>
                open(`https://blah.chat/chat/${selectedConvo._id}`)
              }
            />
          )}
        </ActionPanel>
      }
    />
  );
}
