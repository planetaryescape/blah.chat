/**
 * ModelPicker - Searchable list of available models
 */

import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { listModels, type Model } from "../lib/api";
import { getApiKey, getClient } from "../lib/client";

interface ModelPickerProps {
  current: string;
  onSelect: (modelId: string) => void;
}

const PROVIDER_ICONS: Record<string, string> = {
  OpenAI: "🟢",
  Anthropic: "🟠",
  Google: "🔵",
  xAI: "⚫",
  Perplexity: "🟣",
  Groq: "🔴",
  Cerebras: "🟡",
  DeepSeek: "🔷",
  Meta: "🔵",
  Mistral: "🟤",
};

export function ModelPicker({ current, onSelect }: ModelPickerProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const client = getClient();
        const apiKey = getApiKey();
        const result = await listModels(client, apiKey);
        if (result) {
          setModels(result);
        }
      } catch (_e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load models",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      const provider = model.provider;
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    },
    {} as Record<string, Model[]>,
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models..."
      navigationTitle="Select Model"
    >
      {Object.entries(groupedModels).map(([provider, providerModels]) => (
        <List.Section
          key={provider}
          title={`${PROVIDER_ICONS[provider] || "🤖"} ${provider}`}
        >
          {providerModels.map((model) => (
            <List.Item
              key={model.id}
              title={model.name}
              subtitle={model.id}
              icon={model.id === current ? Icon.CheckCircle : Icon.Circle}
              accessories={[
                ...(model.isPro
                  ? [{ tag: { value: "Pro", color: Color.Purple } }]
                  : []),
                ...(model.id === current
                  ? [{ tag: { value: "Current", color: Color.Green } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Model"
                    icon={Icon.Check}
                    onAction={() => {
                      onSelect(model.id);
                      showToast({
                        style: Toast.Style.Success,
                        title: `Switched to ${model.name}`,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
