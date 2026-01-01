/**
 * Projects Command - Browse projects
 */

import { List, ActionPanel, Action, Icon, open } from "@raycast/api";
import { useState, useEffect } from "react";
import { getClient, getApiKey } from "./lib/client";
import { listProjects, type Project } from "./lib/api";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const client = getClient();
        const apiKey = getApiKey();
        const result = await listProjects(client, apiKey, { limit: 50 });
        if (result) {
          setProjects(result);
        } else {
          setError("Invalid API key");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load projects");
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
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Projects"
          description="Your projects will appear here"
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project._id}
            title={project.name}
            subtitle={project.description}
            accessories={[{ date: new Date(project.createdAt) }]}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Open Project"
                  icon={Icon.Globe}
                  onAction={() =>
                    open(`https://blah.chat/projects/${project._id}`)
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={project.name}
                />
                {project.description && (
                  <Action.CopyToClipboard
                    title="Copy Description"
                    content={project.description}
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
