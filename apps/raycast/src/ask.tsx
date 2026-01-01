import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  type LaunchProps,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ModelPicker } from "./components/ModelPicker";
import {
  createBookmark,
  createConversation,
  createNote,
  getUserDefaultModel,
  listMessages,
  listModels,
  type Message,
  type Model,
  sendMessage,
} from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

interface Arguments {
  query?: string;
}

type View = "form" | "response" | "reply";

export default function AskCommand(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { query } = props.arguments;

  const [view, setView] = useState<View>(query?.trim() ? "response" : "form");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("openai:gpt-4o");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [response, setResponse] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string>("");
  const [lastAssistantMessageId, setLastAssistantMessageId] = useState<
    string | null
  >(null);
  const hasAutoSubmitted = useRef(false);

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const client = getClient();
        const apiKey = getApiKey();

        const [modelList, userDefault] = await Promise.all([
          listModels(client, apiKey),
          getUserDefaultModel(client, apiKey),
        ]);

        if (modelList) {
          setModels(modelList);
        }
        setSelectedModel(userDefault);
        setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load models:", error);
        setModelsLoaded(true); // Allow fallback
      }
    }
    loadModels();
  }, []);

  // Auto-submit when query argument provided and models loaded
  useEffect(() => {
    if (query?.trim() && modelsLoaded && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleQuickAsk(query);
    }
  }, [query, modelsLoaded]);

  async function handleQuickAsk(message: string) {
    setIsLoading(true);
    setResponse("Thinking...");
    setUserMessage(message);

    try {
      const client = getClient();
      const apiKey = getApiKey();

      const { conversationId: newConvoId } = await createConversation(
        client,
        apiKey,
        { model: selectedModel },
      );
      setConversationId(newConvoId);

      await sendMessage(client, apiKey, {
        conversationId: newConvoId,
        content: message,
        modelId: selectedModel,
      });

      await pollForCompletion(newConvoId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      showToast({ style: Toast.Style.Failure, title: "Error", message: msg });
      setResponse(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFormSubmit(values: { message: string; model: string }) {
    if (!values.message.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Message required" });
      return;
    }

    setView("response");
    setIsLoading(true);
    setResponse("Thinking...");
    setUserMessage(values.message);

    try {
      const client = getClient();
      const apiKey = getApiKey();

      const { conversationId: newConvoId } = await createConversation(
        client,
        apiKey,
        { model: values.model },
      );
      setConversationId(newConvoId);

      await sendMessage(client, apiKey, {
        conversationId: newConvoId,
        content: values.message,
        modelId: values.model,
      });

      await pollForCompletion(newConvoId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      showToast({ style: Toast.Style.Failure, title: "Error", message: msg });
      setResponse(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReplySubmit(values: { message: string; model: string }) {
    if (!values.message.trim() || !conversationId) {
      showToast({ style: Toast.Style.Failure, title: "Message required" });
      return;
    }

    setView("response");
    setIsLoading(true);

    // Append user message to display
    setResponse(
      (prev) =>
        `${prev}\n\n---\n\n**You**\n\n${values.message}\n\n**Assistant**\n\n_Thinking..._`,
    );

    try {
      const client = getClient();
      const apiKey = getApiKey();

      await sendMessage(client, apiKey, {
        // @ts-expect-error - Id type
        conversationId: conversationId,
        content: values.message,
        modelId: values.model,
      });

      await pollForCompletionWithHistory(conversationId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      showToast({ style: Toast.Style.Failure, title: "Error", message: msg });
    } finally {
      setIsLoading(false);
    }
  }

  async function pollForCompletion(convoId: string) {
    const client = getClient();
    const apiKey = getApiKey();
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // @ts-expect-error - Id type
      const messages = await listMessages(client, apiKey, convoId);
      if (!messages || messages.length === 0) {
        attempts++;
        await sleep(500);
        continue;
      }

      const assistantMessage = messages.find(
        (m: Message) => m.role === "assistant",
      );
      if (!assistantMessage) {
        attempts++;
        await sleep(500);
        continue;
      }

      const content =
        assistantMessage.content || assistantMessage.partialContent || "";
      setResponse(content || "Generating...");

      if (
        assistantMessage.status === "complete" ||
        assistantMessage.status === "error" ||
        assistantMessage.status === "stopped"
      ) {
        if (assistantMessage.status === "error") {
          setResponse(
            `Error: ${assistantMessage.error || "Generation failed"}`,
          );
        } else {
          setResponse(content);
          setLastAssistantMessageId(assistantMessage._id);
        }
        return;
      }

      attempts++;
      await sleep(500);
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Timeout",
      message: "Response took too long",
    });
  }

  async function pollForCompletionWithHistory(convoId: string) {
    const client = getClient();
    const apiKey = getApiKey();
    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // @ts-expect-error - Id type
      const messages = await listMessages(client, apiKey, convoId);
      if (!messages || messages.length === 0) {
        attempts++;
        await sleep(500);
        continue;
      }

      // Format full conversation
      const formatted = messages
        .map((m: Message) => {
          const role = m.role === "user" ? "**You**" : "**Assistant**";
          const content = m.content || m.partialContent || "_Generating..._";
          return `${role}\n\n${content}`;
        })
        .join("\n\n---\n\n");

      setResponse(formatted);

      // Check if latest assistant message is done
      const lastAssistant = [...messages]
        .reverse()
        .find((m: Message) => m.role === "assistant");
      if (
        lastAssistant &&
        (lastAssistant.status === "complete" ||
          lastAssistant.status === "error" ||
          lastAssistant.status === "stopped")
      ) {
        return;
      }

      attempts++;
      await sleep(500);
    }

    showToast({
      style: Toast.Style.Failure,
      title: "Timeout",
      message: "Response took too long",
    });
  }

  // Form view - shown when no query argument
  if (view === "form") {
    return (
      <Form
        isLoading={isLoading || !modelsLoaded}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Ask" onSubmit={handleFormSubmit} />
            <Action.Push
              title="Change Model"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              target={
                <ModelPicker
                  current={selectedModel}
                  onSelect={setSelectedModel}
                />
              }
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="message"
          title="Message"
          placeholder="Ask anything..."
          autoFocus
        />
        <Form.Dropdown id="model" title="Model" defaultValue={selectedModel}>
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

  // Reply form view
  if (view === "reply") {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Send Reply"
              onSubmit={handleReplySubmit}
            />
            <Action.Push
              title="Change Model"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              target={
                <ModelPicker
                  current={selectedModel}
                  onSelect={setSelectedModel}
                />
              }
            />
            <Action
              title="Back to Response"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "escape" }}
              onAction={() => setView("response")}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="message"
          title="Reply"
          placeholder="Continue the conversation..."
          autoFocus
        />
        <Form.Dropdown id="model" title="Model" defaultValue={selectedModel}>
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

  // Handler for saving as note
  async function handleAddAsNote() {
    if (!response || !conversationId) return;

    try {
      const client = getClient();
      const apiKey = getApiKey();
      await createNote(client, apiKey, {
        content: response,
        title: userMessage.slice(0, 50) || "Chat response",
        // @ts-expect-error - Id type
        sourceConversationId: conversationId,
      });
      showToast({ style: Toast.Style.Success, title: "Saved as note" });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save note",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }

  // Handler for adding bookmark
  async function handleAddBookmark() {
    if (!conversationId || !lastAssistantMessageId) {
      showToast({
        style: Toast.Style.Failure,
        title: "No message to bookmark",
      });
      return;
    }

    try {
      const client = getClient();
      const apiKey = getApiKey();
      await createBookmark(client, apiKey, {
        // @ts-expect-error - Id type
        messageId: lastAssistantMessageId,
        // @ts-expect-error - Id type
        conversationId: conversationId,
        note: userMessage.slice(0, 100) || undefined,
      });
      showToast({ style: Toast.Style.Success, title: "Bookmarked" });
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to bookmark",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  }

  // Response view
  return (
    <Detail
      isLoading={isLoading}
      markdown={response}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Reply"
              icon={Icon.Reply}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setView("reply")}
            />
            <Action
              title="Copy Response"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => {
                Clipboard.copy(response);
                showToast({ style: Toast.Style.Success, title: "Copied!" });
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Save as Note"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              onAction={handleAddAsNote}
            />
            <Action
              title="Add Bookmark"
              icon={Icon.Bookmark}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={handleAddBookmark}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Change Model"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              target={
                <ModelPicker
                  current={selectedModel}
                  onSelect={setSelectedModel}
                />
              }
            />
            <Action
              title="New Question"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                setView("form");
                setResponse("");
                setConversationId(null);
                setUserMessage("");
                setLastAssistantMessageId(null);
                hasAutoSubmitted.current = false;
              }}
            />
          </ActionPanel.Section>
          {conversationId && (
            <ActionPanel.Section>
              <Action
                title="Open in Browser"
                icon={Icon.Globe}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() =>
                  open(`https://blah.chat/chat/${conversationId}`)
                }
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
