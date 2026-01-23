/**
 * Bookmarks Command - Browse bookmarked messages
 */

import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { type Bookmark, listBookmarks } from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

export default function Command() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const client = getClient();
        const apiKey = getApiKey();
        const result = await listBookmarks(client, apiKey, { limit: 50 });
        if (result) {
          setBookmarks(result);
        } else {
          setError("Invalid API key");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load bookmarks");
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmarks...">
      {bookmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks"
          description="Your bookmarked messages will appear here"
        />
      ) : (
        bookmarks.map((bookmark) => (
          <List.Item
            key={bookmark._id}
            title={bookmark.messagePreview || "No preview"}
            subtitle={bookmark.note}
            accessories={[
              ...(bookmark.tags?.length
                ? [{ tag: { value: bookmark.tags[0], color: Color.Blue } }]
                : []),
              { date: new Date(bookmark.createdAt) },
            ]}
            icon={Icon.Bookmark}
            actions={
              <ActionPanel>
                <Action
                  title="Open Conversation"
                  icon={Icon.Globe}
                  onAction={() =>
                    open(`https://blah.chat/chat/${bookmark.conversationId}`)
                  }
                />
                {bookmark.messagePreview && (
                  <Action.CopyToClipboard
                    title="Copy Message Preview"
                    content={bookmark.messagePreview}
                  />
                )}
                {bookmark.note && (
                  <Action.CopyToClipboard
                    title="Copy Note"
                    content={bookmark.note}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
