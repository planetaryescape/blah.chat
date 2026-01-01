/**
 * Memories Command - Browse AI memories
 */

import { List, ActionPanel, Action, Icon, Color, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { getClient, getApiKey } from "./lib/client";
import { listMemories, type Memory } from "./lib/api";

export default function Command() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const client = getClient();
        const apiKey = getApiKey();
        const result = await listMemories(client, apiKey, { limit: 100 });
        if (result) {
          setMemories(result);
        } else {
          setError("Invalid API key");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load memories");
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

  const categoryColors: Record<string, Color> = {
    preference: Color.Blue,
    fact: Color.Green,
    context: Color.Orange,
    instruction: Color.Purple,
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search memories...">
      {memories.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Brain}
          title="No Memories"
          description="Your AI memories will appear here"
        />
      ) : (
        memories.map((memory) => (
          <List.Item
            key={memory._id}
            title={
              memory.content.slice(0, 80) +
              (memory.content.length > 80 ? "..." : "")
            }
            subtitle={memory.category}
            accessories={[
              ...(memory.importance
                ? [
                    {
                      tag: {
                        value: `★${memory.importance}`,
                        color: Color.Yellow,
                      },
                    },
                  ]
                : []),
              { date: new Date(memory.createdAt) },
            ]}
            icon={{
              source: Icon.Brain,
              tintColor: categoryColors[memory.category] || Color.SecondaryText,
            }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Memory"
                  content={memory.content}
                />
                <Action
                  title="Open Memories"
                  icon={Icon.Globe}
                  onAction={() => open("https://blah.chat/memories")}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
