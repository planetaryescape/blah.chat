import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { listConversations, type Conversation } from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

export default function RecentCommand() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const client = getClient();
        const apiKey = getApiKey();
        const convoList = await listConversations(client, apiKey, {
          limit: 10,
        });
        if (convoList) setConversations(convoList);
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

  function formatTime(timestamp: number | undefined): string {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  }

  return (
    <List isLoading={isLoading}>
      {conversations.map((convo) => (
        <List.Item
          key={String(convo._id)}
          title={convo.title || "New Chat"}
          subtitle={convo.model || undefined}
          accessories={[
            { text: formatTime(convo.lastMessageAt) },
            { text: `${convo.messageCount || 0} msgs` },
            ...(convo.pinned ? [{ icon: "📌" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Browser"
                onAction={() => open(`https://blah.chat/chat/${convo._id}`)}
              />
              <Action.CopyToClipboard
                title="Copy Chat Link"
                content={`https://blah.chat/chat/${convo._id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
