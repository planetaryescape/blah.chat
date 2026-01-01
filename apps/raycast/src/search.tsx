import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import { useState, useCallback } from "react";
import { searchConversations, type Conversation } from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

export default function SearchCommand() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    try {
      const client = getClient();
      const apiKey = getApiKey();
      const results = await searchConversations(client, apiKey, {
        query,
        limit: 20,
      });
      if (results) setConversations(results);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
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
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search conversations..."
      onSearchTextChange={handleSearch}
      throttle
    >
      {conversations.length === 0 ? (
        <List.EmptyView
          title="No conversations found"
          description="Type to search your chat history"
        />
      ) : (
        conversations.map((convo) => (
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
        ))
      )}
    </List>
  );
}
