# Phase 3: Multi-Model Support

**Goal**: Support 10+ models from 4 providers, switch mid-conversation.

**Status**: Ready after Phase 2C
**Dependencies**: Phase 2C (conversation management)
**Estimated Effort**: ~2-3 days

---

## Overview

Integrate OpenAI, Anthropic, Google, Ollama. Model picker UI. Thinking effort control. Per-message model tracking.

---

## Models to Support

**OpenAI**:

- gpt-5, gpt-5-mini
- o1, o1-mini, o3-mini (reasoning)

**Anthropic**:

- claude-4-opus, claude-4-sonnet, claude-3.5-haiku

**Google**:

- gemini-2.0-flash, gemini-2.5-pro

**Ollama** (local):

- llama, mistral, phi, etc.

---

## Tasks

### 1. Install Provider SDKs

```bash
npm install @ai-sdk/anthropic @ai-sdk/google
```

---

### 2. Expand Registry

```typescript
// lib/ai/registry.ts
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createProviderRegistry } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Ollama (OpenAI-compatible)
const ollama = createOpenAI({
  name: "ollama",
  apiKey: "ollama", // Ollama doesn't require real key
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
});

export const registry = createProviderRegistry({
  openai,
  anthropic,
  google,
  ollama,
});

export const DEFAULT_MODEL = "openai:gpt-4o-mini";
```

**Environment variables**:

```bash
# .env.local
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434/v1
```

---

### 3. Complete Model Configuration

```typescript
// lib/ai/models.ts
export interface ModelConfig {
  id: string;
  provider: "openai" | "anthropic" | "google" | "ollama";
  name: string;
  description?: string;
  contextWindow: number;
  pricing: {
    input: number; // per 1M tokens
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: (
    | "vision"
    | "function-calling"
    | "thinking"
    | "extended-thinking"
  )[];
  supportsThinkingEffort?: boolean;
  isLocal?: boolean;
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // OpenAI
  "openai:gpt-4o": {
    id: "openai:gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    description: "Most capable multimodal model",
    contextWindow: 128000,
    pricing: { input: 2.5, output: 10.0, cached: 1.25 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:gpt-4o-mini": {
    id: "openai:gpt-4o-mini",
    provider: "openai",
    name: "GPT-4o Mini",
    description: "Fast and affordable",
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6, cached: 0.075 },
    capabilities: ["vision", "function-calling"],
  },
  "openai:o1": {
    id: "openai:o1",
    provider: "openai",
    name: "o1",
    description: "Advanced reasoning",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 60.0, reasoning: 15.0 },
    capabilities: ["thinking"],
    supportsThinkingEffort: true,
  },
  "openai:o1-mini": {
    id: "openai:o1-mini",
    provider: "openai",
    name: "o1-mini",
    description: "Faster reasoning",
    contextWindow: 128000,
    pricing: { input: 3.0, output: 12.0, reasoning: 3.0 },
    capabilities: ["thinking"],
    supportsThinkingEffort: true,
  },
  "openai:o3-mini": {
    id: "openai:o3-mini",
    provider: "openai",
    name: "o3-mini",
    description: "Latest reasoning model",
    contextWindow: 200000,
    pricing: { input: 1.1, output: 4.4, reasoning: 1.1 },
    capabilities: ["thinking"],
    supportsThinkingEffort: true,
  },

  // Anthropic
  "anthropic:claude-4-opus": {
    id: "anthropic:claude-4-opus",
    provider: "anthropic",
    name: "Claude 4 Opus",
    description: "Most capable Claude model",
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0, cached: 1.5 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-4-sonnet": {
    id: "anthropic:claude-4-sonnet",
    provider: "anthropic",
    name: "Claude 4 Sonnet",
    description: "Balanced performance",
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0, cached: 0.3 },
    capabilities: ["vision", "thinking", "extended-thinking"],
    supportsThinkingEffort: true,
  },
  "anthropic:claude-3.5-haiku": {
    id: "anthropic:claude-3.5-haiku",
    provider: "anthropic",
    name: "Claude 3.5 Haiku",
    description: "Fast and affordable",
    contextWindow: 200000,
    pricing: { input: 0.8, output: 4.0, cached: 0.08 },
    capabilities: ["vision"],
  },

  // Google
  "google:gemini-2.0-flash": {
    id: "google:gemini-2.0-flash",
    provider: "google",
    name: "Gemini 2.0 Flash",
    description: "Fast multimodal model",
    contextWindow: 1000000,
    pricing: { input: 0.3, output: 1.2, cached: 0.075 },
    capabilities: ["vision", "function-calling"],
  },
  "google:gemini-2.5-pro": {
    id: "google:gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    description: "Most capable Gemini",
    contextWindow: 2000000,
    pricing: { input: 2.5, output: 10.0, cached: 0.625 },
    capabilities: ["vision", "function-calling", "thinking"],
  },

  // Ollama (placeholder - dynamically loaded)
  "ollama:llama": {
    id: "ollama:llama",
    provider: "ollama",
    name: "Llama (local)",
    description: "Local model via Ollama",
    contextWindow: 128000,
    pricing: { input: 0, output: 0 },
    capabilities: [],
    isLocal: true,
  },
};

export function getModelConfig(modelId: string): ModelConfig | undefined {
  return MODEL_CONFIG[modelId];
}

export function calculateCost(
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  },
): number {
  const config = MODEL_CONFIG[model];
  if (!config || config.isLocal) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * config.pricing.output;
  const cachedCost =
    ((usage.cachedTokens || 0) / 1_000_000) * (config.pricing.cached || 0);
  const reasoningCost =
    ((usage.reasoningTokens || 0) / 1_000_000) *
    (config.pricing.reasoning || 0);

  return inputCost + outputCost + cachedCost + reasoningCost;
}

// Group models by provider for UI
export function getModelsByProvider() {
  const grouped: Record<string, ModelConfig[]> = {
    openai: [],
    anthropic: [],
    google: [],
    ollama: [],
  };

  Object.values(MODEL_CONFIG).forEach((model) => {
    grouped[model.provider].push(model);
  });

  return grouped;
}
```

---

### 4. Model Selector Component

```typescript
// components/chat/ModelSelector.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Check, ChevronDown } from 'lucide-react';
import { getModelsByProvider, getModelConfig } from '@/lib/ai/models';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const modelsByProvider = getModelsByProvider();
  const currentModel = getModelConfig(value);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-between">
          <span>{currentModel?.name || 'Select model'}</span>
          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {Object.entries(modelsByProvider).map(([provider, models]) => {
            if (models.length === 0) return null;

            return (
              <div key={provider}>
                <h3 className="font-semibold mb-2 capitalize">{provider}</h3>
                <div className="space-y-1">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary transition-colors text-left',
                        value === model.id && 'border-primary bg-accent'
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{model.name}</span>
                          {model.isLocal && (
                            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">
                              Local
                            </span>
                          )}
                          {value === model.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        {model.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {model.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{model.contextWindow.toLocaleString()} tokens</span>
                          {!model.isLocal && (
                            <span>
                              ${model.pricing.input} / ${model.pricing.output} per 1M
                            </span>
                          )}
                          {model.isLocal && <span className="text-green-500">Free</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 5. Thinking Effort Selector

```typescript
// components/chat/ThinkingEffortSelector.tsx
'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type ThinkingEffort = 'low' | 'medium' | 'high';

interface ThinkingEffortSelectorProps {
  value: ThinkingEffort;
  onChange: (effort: ThinkingEffort) => void;
}

export function ThinkingEffortSelector({
  value,
  onChange,
}: ThinkingEffortSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Thinking Effort</Label>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as ThinkingEffort)}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="low" id="low" />
          <Label htmlFor="low" className="font-normal cursor-pointer">
            Low - Faster, less thorough
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="medium" id="medium" />
          <Label htmlFor="medium" className="font-normal cursor-pointer">
            Medium - Balanced
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="high" id="high" />
          <Label htmlFor="high" className="font-normal cursor-pointer">
            High - More comprehensive reasoning
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
```

---

### 6. Update Chat Page with Model Selection

```typescript
// app/(main)/chat/[conversationId]/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { ThinkingEffortSelector, ThinkingEffort } from '@/components/chat/ThinkingEffortSelector';
import { DEFAULT_MODEL } from '@/lib/ai/registry';
import { getModelConfig } from '@/lib/ai/models';

export default function ChatPage({
  params,
}: {
  params: { conversationId: Id<'conversations'> };
}) {
  const conversation = useQuery(api.conversations.get, {
    conversationId: params.conversationId,
  });

  const messages = useQuery(api.messages.listByConversation, {
    conversationId: params.conversationId,
  });

  const sendMessage = useMutation(api.chat.sendMessage);

  const [selectedModel, setSelectedModel] = useState(
    conversation?.model || DEFAULT_MODEL
  );
  const [thinkingEffort, setThinkingEffort] = useState<ThinkingEffort>('medium');

  const modelConfig = getModelConfig(selectedModel);
  const showThinkingEffort = modelConfig?.supportsThinkingEffort;

  const handleSend = async (content: string) => {
    await sendMessage({
      conversationId: params.conversationId,
      content,
      model: selectedModel,
      thinkingEffort: showThinkingEffort ? thinkingEffort : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with model selector */}
      <div className="border-b p-4 flex items-center gap-4">
        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
        {showThinkingEffort && (
          <ThinkingEffortSelector value={thinkingEffort} onChange={setThinkingEffort} />
        )}
      </div>

      <MessageList messages={messages || []} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
```

---

### 7. Update Generation Action for Thinking Effort

```typescript
// convex/generation.ts - update generateResponse
export const generateResponse = internalAction({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    model: v.string(),
    thinkingEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    ),
  },
  handler: async (ctx, args) => {
    try {
      // ... existing message history code

      const modelConfig = getModelConfig(args.model);

      // Build generation options
      const options: any = {
        model: registry.languageModel(args.model),
        messages: historyMessages,
      };

      // OpenAI o1/o3 reasoning effort
      if (args.thinkingEffort && args.model.startsWith("openai:o")) {
        options.providerOptions = {
          openai: {
            reasoningEffort: args.thinkingEffort,
          },
        };
      }

      // Anthropic thinking budget
      if (
        args.thinkingEffort &&
        modelConfig?.capabilities.includes("extended-thinking")
      ) {
        const budgets = { low: 5000, medium: 15000, high: 30000 };
        options.providerOptions = {
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: budgets[args.thinkingEffort],
            },
          },
        };
        options.headers = {
          "anthropic-beta": "interleaved-thinking-2025-05-14",
        };
      }

      const result = streamText(options);

      // ... rest of streaming logic
    } catch (error) {
      // ... error handling
    }
  },
});
```

---

### 8. Ollama Integration

**Check Ollama status**:

```typescript
// lib/ai/ollama.ts
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/tags`,
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(
      `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/api/tags`,
    );
    if (!response.ok) return [];

    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch {
    return [];
  }
}
```

**Add to model selector** (dynamically load Ollama models).

---

## Deliverables

1. All providers configured (OpenAI, Anthropic, Google, Ollama)
2. 10+ models supported
3. Model selector UI
4. Thinking effort control for reasoning models
5. Per-message model tracking
6. Model switching mid-conversation works
7. Cost calculation updated for all models
8. Ollama detection and integration

---

## Acceptance Criteria

- [ ] Can select any of 10+ models
- [ ] Model selector shows provider, pricing, context window
- [ ] Thinking effort control shows for o1/Claude models
- [ ] Can switch models mid-conversation
- [ ] Each message tracks which model generated it
- [ ] Cost calculated correctly for all models
- [ ] Ollama models detected and work
- [ ] Local badge shown for Ollama models

---

## Next Steps

Phase 4: Rich input (file uploads, voice)
