import {
  Action,
  ActionPanel,
  Detail,
  Form,
  List,
  showToast,
  Toast,
  Clipboard,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  listConversations,
  listMessages,
  listModels,
  sendMessage,
  type Conversation,
  type Message,
  type Model,
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
      // @ts-expect-error - Id type
      const msgs = await listMessages(client, apiKey, convo._id);
      if (msgs) setMessages(msgs);
    } catch (error) {
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
        // @ts-expect-error - Id type
        conversationId: selectedConvo._id,
        content: values.message,
        modelId: values.model || selectedConvo.model || undefined,
      });

      // Poll for completion
      // @ts-expect-error - Id type
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
      // @ts-expect-error - Id type
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

    return messages
      .map((msg) => {
        const role = msg.role === "user" ? "**You**" : "**Assistant**";
        const content = msg.content || msg.partialContent || "_Generating..._";
        return `${role}\n\n${content}`;
      })
      .join("\n\n---\n\n");
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
