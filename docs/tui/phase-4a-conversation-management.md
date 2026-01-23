# Phase 4A: Conversation Management

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase adds conversation management features: creating new chats and selecting models.

### Project Background

- **Framework**: Ink (React for CLI)
- **Current State**: Full chat functionality with streaming (Milestone 3)
- **Models**: 46 AI models available in blah.chat

### What Came Before

- **Milestone 1**: Foundation (hooks, auth)
- **Milestone 2**: Read-only (view conversations/messages)
- **Milestone 3**: Interactive (send messages, streaming)

### What Comes After

- **Phase 4B**: Search and settings
- **Phase 4C**: Polish (keybindings, themes)

## Goal

Add conversation management:
- Create new conversations
- Select model for new/existing chats
- Archive/delete conversations
- Quick model switching

**Success criteria**: Press 'n' → select model → start chatting.

## Prerequisites

- Phase 3B complete (streaming works)
- Model configuration available from `@blah-chat/ai`

## Implementation

### Step 1: Create Model Selector Component

Create `apps/cli/src/components/model-selector.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";

// Subset of popular models for TUI
const AVAILABLE_MODELS = [
  { value: "openai:gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "openai:gpt-4o-mini", label: "GPT-4o mini", provider: "OpenAI" },
  { value: "anthropic:claude-3-5-sonnet-20241022", label: "Claude Sonnet", provider: "Anthropic" },
  { value: "anthropic:claude-3-opus-20240229", label: "Claude Opus", provider: "Anthropic" },
  { value: "google:gemini-2.0-flash-exp", label: "Gemini Flash", provider: "Google" },
  { value: "google:gemini-1.5-pro", label: "Gemini Pro", provider: "Google" },
  { value: "xai:grok-2-latest", label: "Grok 2", provider: "xAI" },
  { value: "openai:o1", label: "o1 (Reasoning)", provider: "OpenAI" },
  { value: "anthropic:claude-3-5-sonnet-20241022", label: "Claude (Thinking)", provider: "Anthropic" },
] as const;

interface ModelSelectorProps {
  currentModel?: string;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

export function ModelSelector({
  currentModel,
  onSelect,
  onCancel,
}: ModelSelectorProps) {
  const items = AVAILABLE_MODELS.map((model) => ({
    label: `${model.label} (${model.provider})`,
    value: model.value,
  }));

  useInput((input, key) => {
    if (key.escape || input === "q") {
      onCancel();
    }
  });

  const initialIndex = items.findIndex((item) => item.value === currentModel);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Select Model</Text>
      </Box>

      <SelectInput
        items={items}
        initialIndex={initialIndex >= 0 ? initialIndex : 0}
        onSelect={(item) => onSelect(item.value)}
      />

      <Box marginTop={1}>
        <Text dimColor>Enter:select  Esc:cancel</Text>
      </Box>
    </Box>
  );
}

// Quick model display for header
export function ModelBadge({ modelId }: { modelId: string }) {
  const model = AVAILABLE_MODELS.find((m) => m.value === modelId);
  const label = model?.label || modelId.split(":").pop() || "Unknown";
  const color = getProviderColor(modelId);

  return (
    <Text color={color} dimColor>
      [{label}]
    </Text>
  );
}

function getProviderColor(modelId: string): string {
  if (modelId.startsWith("openai:")) return "green";
  if (modelId.startsWith("anthropic:")) return "magenta";
  if (modelId.startsWith("google:")) return "blue";
  if (modelId.startsWith("xai:")) return "cyan";
  return "white";
}
```

### Step 2: Create New Conversation Hook

Create `packages/hooks/src/mutations/useCreateConversation.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../client/useApiClient.js";
import { queryKeys } from "../utils/queryKeys.js";

export interface CreateConversationArgs {
  model: string;
  title?: string;
  systemPrompt?: string;
}

export interface CreateConversationResult {
  _id: string;
  title: string;
  model: string;
}

export function useCreateConversation() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateConversationArgs): Promise<CreateConversationResult> => {
      return apiClient.post<CreateConversationResult>("/api/v1/conversations", {
        model: args.model,
        title: args.title || "New Chat",
        systemPrompt: args.systemPrompt,
      });
    },

    onSuccess: () => {
      // Invalidate conversation list
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
  });
}
```

Update `packages/hooks/src/index.ts`:

```typescript
// ... existing exports ...

export { useCreateConversation } from "./mutations/useCreateConversation.js";
export type { CreateConversationArgs, CreateConversationResult } from "./mutations/useCreateConversation.js";
```

### Step 3: Create New Chat Dialog

Create `apps/cli/src/components/new-chat-dialog.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { ModelSelector } from "./model-selector.js";
import { useCreateConversation } from "@blah-chat/hooks";

type Step = "model" | "creating";

interface NewChatDialogProps {
  onCreated: (conversationId: string) => void;
  onCancel: () => void;
}

export function NewChatDialog({ onCreated, onCancel }: NewChatDialogProps) {
  const [step, setStep] = useState<Step>("model");
  const createConversation = useCreateConversation();

  const handleModelSelect = async (modelId: string) => {
    setStep("creating");

    try {
      const result = await createConversation.mutateAsync({
        model: modelId,
        title: "New Chat",
      });
      onCreated(result._id);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      onCancel();
    }
  };

  if (step === "creating") {
    return (
      <Box padding={1}>
        <Text>Creating conversation...</Text>
      </Box>
    );
  }

  return (
    <ModelSelector
      onSelect={handleModelSelect}
      onCancel={onCancel}
    />
  );
}
```

### Step 4: Add Archive/Delete Hooks

Create `packages/hooks/src/mutations/useArchiveConversation.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../client/useApiClient.js";
import { queryKeys } from "../utils/queryKeys.js";

export function useArchiveConversation() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      archived,
    }: {
      conversationId: string;
      archived: boolean;
    }) => {
      return apiClient.post(`/api/v1/conversations/${conversationId}/archive`, {
        archived,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
  });
}

export function useDeleteConversation() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      return apiClient.delete(`/api/v1/conversations/${conversationId}`);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
  });
}
```

### Step 5: Create Conversation Actions Menu

Create `apps/cli/src/components/conversation-actions.tsx`:

```typescript
import React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { useArchiveConversation, useDeleteConversation } from "@blah-chat/hooks";

interface ConversationActionsProps {
  conversationId: string;
  isArchived: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function ConversationActions({
  conversationId,
  isArchived,
  onClose,
  onDeleted,
}: ConversationActionsProps) {
  const archiveConversation = useArchiveConversation();
  const deleteConversation = useDeleteConversation();

  const items = [
    {
      label: isArchived ? "Unarchive" : "Archive",
      value: "archive",
    },
    {
      label: "Delete",
      value: "delete",
    },
    {
      label: "Cancel",
      value: "cancel",
    },
  ];

  const handleSelect = async (item: { value: string }) => {
    switch (item.value) {
      case "archive":
        await archiveConversation.mutateAsync({
          conversationId,
          archived: !isArchived,
        });
        onClose();
        break;

      case "delete":
        await deleteConversation.mutateAsync(conversationId);
        onDeleted();
        break;

      case "cancel":
        onClose();
        break;
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Conversation Actions</Text>
      </Box>

      <SelectInput items={items} onSelect={handleSelect} />

      <Box marginTop={1}>
        <Text dimColor>Enter:select  Esc:cancel</Text>
      </Box>
    </Box>
  );
}
```

### Step 6: Update Chat App with New Features

Update `apps/cli/src/commands/chat.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { AppProviders } from "../providers/index.js";
import { ConversationList } from "../components/conversation-list.js";
import { ChatView } from "../components/chat-view.js";
import { NewChatDialog } from "../components/new-chat-dialog.js";
import { ConversationActions } from "../components/conversation-actions.js";
import { ModelSelector } from "../components/model-selector.js";
import { useCLIAuth } from "../providers/index.js";
import { useConversations } from "@blah-chat/hooks";

type View = "list" | "chat" | "new-chat" | "actions" | "model-switch";

function ChatAppInner() {
  const { exit } = useApp();
  const { isAuthenticated, credentials } = useCLIAuth();
  const { data: conversations } = useConversations();

  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedConversation = conversations?.[selectedIndex];

  useInput((input, key) => {
    // Only handle input in list view
    if (view !== "list") return;

    // Quit
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    // Navigation
    if (input === "j" || key.downArrow) {
      setSelectedIndex((prev) =>
        Math.min(prev + 1, (conversations?.length ?? 1) - 1)
      );
    }
    if (input === "k" || key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }

    // Select conversation
    if (key.return && selectedConversation) {
      setSelectedConversationId(selectedConversation._id);
      setView("chat");
    }

    // New chat
    if (input === "n") {
      setView("new-chat");
    }

    // Actions menu
    if (input === "a" && selectedConversation) {
      setSelectedConversationId(selectedConversation._id);
      setView("actions");
    }

    // Model switch for selected conversation
    if (input === "m" && selectedConversation) {
      setSelectedConversationId(selectedConversation._id);
      setView("model-switch");
    }
  });

  const handleBackToList = () => {
    setView("list");
    setSelectedConversationId(null);
  };

  const handleNewChatCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  };

  if (!isAuthenticated) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Not logged in</Text>
        <Text dimColor>Run: blah login</Text>
      </Box>
    );
  }

  // New chat dialog
  if (view === "new-chat") {
    return (
      <NewChatDialog
        onCreated={handleNewChatCreated}
        onCancel={handleBackToList}
      />
    );
  }

  // Actions menu
  if (view === "actions" && selectedConversationId && selectedConversation) {
    return (
      <ConversationActions
        conversationId={selectedConversationId}
        isArchived={selectedConversation.archived}
        onClose={handleBackToList}
        onDeleted={handleBackToList}
      />
    );
  }

  // Model switch
  if (view === "model-switch" && selectedConversation) {
    return (
      <ModelSelector
        currentModel={selectedConversation.model}
        onSelect={async (modelId) => {
          // TODO: Update conversation model via API
          handleBackToList();
        }}
        onCancel={handleBackToList}
      />
    );
  }

  // Chat view
  if (view === "chat" && selectedConversationId) {
    return (
      <ChatView
        conversationId={selectedConversationId}
        onBack={handleBackToList}
      />
    );
  }

  // List view
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">blah.chat</Text>
        <Text dimColor> — {credentials?.email}</Text>
      </Box>

      {/* Conversation List */}
      <Box flexDirection="column" flexGrow={1}>
        <ConversationList selectedIndex={selectedIndex} />
      </Box>

      {/* Footer */}
      <Box
        marginTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text dimColor>j/k:nav  Enter:open  n:new  a:actions  m:model  q:quit</Text>
      </Box>
    </Box>
  );
}

export function ChatApp() {
  return (
    <AppProviders>
      <ChatAppInner />
    </AppProviders>
  );
}
```

### Step 7: Rebuild and Test

```bash
# Rebuild shared hooks
cd packages/hooks && bun run build

# Rebuild CLI
cd apps/cli && bun run build

# Test
blah
```

## Files Created

```
packages/hooks/src/mutations/
├── useCreateConversation.ts
└── useArchiveConversation.ts

apps/cli/src/components/
├── model-selector.tsx
├── new-chat-dialog.tsx
└── conversation-actions.tsx
```

## Files Modified

```
packages/hooks/src/index.ts (add new exports)
apps/cli/src/commands/chat.tsx (add view switching for new features)
```

## Checklist

- [ ] Create `ModelSelector` component
- [ ] Create `useCreateConversation` hook
- [ ] Create `NewChatDialog` component
- [ ] Create `useArchiveConversation` hook
- [ ] Create `useDeleteConversation` hook
- [ ] Create `ConversationActions` menu
- [ ] Update `ChatApp` with new views
- [ ] Add keyboard shortcuts (n, a, m)
- [ ] Rebuild packages
- [ ] Test new chat flow
- [ ] Test archive/delete flow

## Testing

1. Press 'n' to create new chat
2. Select a model
3. Verify conversation created
4. Start chatting
5. Press Esc → 'a' for actions
6. Test archive
7. Test delete

## Next Phase

After this phase, proceed to [Phase 4B: Search & Settings](./phase-4b-search-settings.md) to add conversation search and user settings.
