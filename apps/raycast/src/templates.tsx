/**
 * Templates Command - Browse prompt templates
 */

import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { listTemplates, type Template } from "./lib/api";
import { getApiKey, getClient } from "./lib/client";

export default function Command() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const client = getClient();
        const apiKey = getApiKey();
        const result = await listTemplates(client, apiKey, { limit: 50 });
        if (result) {
          setTemplates(result);
        } else {
          setError("Invalid API key");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load templates");
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
    <List isLoading={isLoading} searchBarPlaceholder="Search templates...">
      {templates.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Templates"
          description="Prompt templates will appear here"
        />
      ) : (
        templates.map((template) => (
          <List.Item
            key={template._id}
            title={template.name}
            subtitle={template.description || template.prompt.slice(0, 50)}
            accessories={[
              { tag: { value: template.category, color: Color.Purple } },
              ...(template.isBuiltIn
                ? [{ tag: { value: "Built-in", color: Color.Green } }]
                : []),
              { text: `${template.usageCount} uses` },
            ]}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action
                  title="Use Template"
                  icon={Icon.Globe}
                  onAction={() =>
                    open(`https://blah.chat/?template=${template._id}`)
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Prompt"
                  content={template.prompt}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={template.name}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
