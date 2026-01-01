# Phase 4B: Search & Settings

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase adds conversation search and user settings.

### Project Background

- **Framework**: Ink (React for CLI)
- **Current State**: Full chat with conversation management (Phase 4A)
- **Goal**: Make it easy to find conversations and customize the experience

### What Came Before

- **Phase 4A**: Conversation management (new chat, model selector, archive/delete)
- **Milestone 3**: Interactive chat with streaming

### What Comes After

- **Phase 4C**: Polish (keybindings, themes)

## Goal

Add search and settings:
- Fuzzy search across conversation titles
- Settings for default model, keybinding mode
- Persistent settings storage

**Success criteria**: Press '/' to search, press 's' to open settings.

## Prerequisites

- Phase 4A complete (conversation management works)

## Implementation

### Step 1: Create Search Component

Create `apps/cli/src/components/search.tsx`:

```typescript
import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useConversations, type Conversation } from "@blah-chat/hooks";
import { formatRelativeTime } from "../lib/utils.js";

interface SearchProps {
  onSelect: (conversationId: string) => void;
  onCancel: () => void;
}

export function Search({ onSelect, onCancel }: SearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: conversations } = useConversations();

  // Fuzzy search
  const results = useMemo(() => {
    if (!conversations || !query.trim()) {
      return conversations?.slice(0, 10) || [];
    }

    const lowerQuery = query.toLowerCase();
    return conversations
      .filter((conv) => {
        const title = conv.title.toLowerCase();
        const model = conv.model.toLowerCase();
        return title.includes(lowerQuery) || model.includes(lowerQuery);
      })
      .slice(0, 10);
  }, [conversations, query]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.downArrow || (key.ctrl && input === "n")) {
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    }

    if (key.upArrow || (key.ctrl && input === "p")) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }

    if (key.return && results[selectedIndex]) {
      onSelect(results[selectedIndex]._id);
    }
  });

  // Reset selection when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Search input */}
      <Box marginBottom={1}>
        <Text color="cyan">🔍 </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Search conversations..."
          focus
        />
      </Box>

      {/* Results */}
      <Box flexDirection="column">
        {results.length === 0 ? (
          <Text dimColor>
            {query ? "No matching conversations" : "Start typing to search..."}
          </Text>
        ) : (
          results.map((conv, index) => (
            <SearchResult
              key={conv._id}
              conversation={conv}
              isSelected={index === selectedIndex}
              query={query}
            />
          ))
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>↑↓:navigate  Enter:select  Esc:cancel</Text>
      </Box>
    </Box>
  );
}

interface SearchResultProps {
  conversation: Conversation;
  isSelected: boolean;
  query: string;
}

function SearchResult({ conversation, isSelected, query }: SearchResultProps) {
  const bgColor = isSelected ? "blue" : undefined;
  const textColor = isSelected ? "white" : undefined;

  // Highlight matching text
  const title = highlightMatch(conversation.title, query);

  return (
    <Box paddingX={1} backgroundColor={bgColor}>
      <Box flexGrow={1}>
        <Text color={textColor} bold={isSelected}>
          {isSelected ? "▸ " : "  "}
          {title}
        </Text>
      </Box>
      <Box width={12}>
        <Text dimColor color={textColor}>
          {getModelShortName(conversation.model)}
        </Text>
      </Box>
      <Box width={10}>
        <Text dimColor color={textColor}>
          {formatRelativeTime(conversation.lastMessageAt)}
        </Text>
      </Box>
    </Box>
  );
}

function highlightMatch(text: string, query: string): string {
  // For terminal, we can't do true highlighting, just return the text
  // Could use chalk or ink's color for actual highlighting
  return text.slice(0, 40) + (text.length > 40 ? "..." : "");
}

function getModelShortName(modelId: string): string {
  const shortNames: Record<string, string> = {
    "openai:gpt-4o": "GPT-4o",
    "openai:gpt-4o-mini": "4o-mini",
    "anthropic:claude-3-5-sonnet-20241022": "Sonnet",
  };
  return shortNames[modelId] || modelId.split(":").pop()?.slice(0, 8) || "";
}
```

### Step 2: Create Settings Storage

Create `apps/cli/src/lib/settings.ts`:

```typescript
import Conf from "conf";

export interface Settings {
  defaultModel: string;
  keyboardMode: "vim" | "arrows" | "both";
  theme: "dark" | "light";
  showTimestamps: boolean;
  compactMode: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "openai:gpt-4o",
  keyboardMode: "both",
  theme: "dark",
  showTimestamps: true,
  compactMode: false,
};

const config = new Conf<{ settings: Settings }>({
  projectName: "blah-chat",
  projectVersion: "1.0.0",
  defaults: {
    settings: DEFAULT_SETTINGS,
  },
});

export function getSettings(): Settings {
  return config.get("settings") || DEFAULT_SETTINGS;
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  config.set("settings", updated);
  return updated;
}

export function resetSettings(): Settings {
  config.set("settings", DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export function getSettingsPath(): string {
  return config.path;
}
```

### Step 3: Create Settings Component

Create `apps/cli/src/components/settings.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import { getSettings, updateSettings, type Settings } from "../lib/settings.js";

interface SettingsViewProps {
  onClose: () => void;
}

type SettingKey = keyof Settings;

const SETTING_OPTIONS: Record<SettingKey, { label: string; options: { label: string; value: any }[] }> = {
  defaultModel: {
    label: "Default Model",
    options: [
      { label: "GPT-4o", value: "openai:gpt-4o" },
      { label: "GPT-4o mini", value: "openai:gpt-4o-mini" },
      { label: "Claude Sonnet", value: "anthropic:claude-3-5-sonnet-20241022" },
      { label: "Claude Opus", value: "anthropic:claude-3-opus-20240229" },
      { label: "Gemini Flash", value: "google:gemini-2.0-flash-exp" },
    ],
  },
  keyboardMode: {
    label: "Keyboard Mode",
    options: [
      { label: "Both (Vim + Arrows)", value: "both" },
      { label: "Vim only (j/k)", value: "vim" },
      { label: "Arrows only", value: "arrows" },
    ],
  },
  theme: {
    label: "Theme",
    options: [
      { label: "Dark", value: "dark" },
      { label: "Light", value: "light" },
    ],
  },
  showTimestamps: {
    label: "Show Timestamps",
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
  },
  compactMode: {
    label: "Compact Mode",
    options: [
      { label: "No", value: false },
      { label: "Yes", value: true },
    ],
  },
};

type Step = "menu" | "editing";

export function SettingsView({ onClose }: SettingsViewProps) {
  const [settings, setSettings] = useState(getSettings);
  const [step, setStep] = useState<Step>("menu");
  const [editingKey, setEditingKey] = useState<SettingKey | null>(null);

  const menuItems = Object.entries(SETTING_OPTIONS).map(([key, config]) => ({
    label: `${config.label}: ${getCurrentValueLabel(key as SettingKey, settings)}`,
    value: key,
  }));

  menuItems.push({ label: "← Back", value: "back" });

  const handleMenuSelect = (item: { value: string }) => {
    if (item.value === "back") {
      onClose();
    } else {
      setEditingKey(item.value as SettingKey);
      setStep("editing");
    }
  };

  const handleOptionSelect = (item: { value: any }) => {
    if (editingKey) {
      const updated = updateSettings({ [editingKey]: item.value });
      setSettings(updated);
    }
    setStep("menu");
    setEditingKey(null);
  };

  useInput((input, key) => {
    if (key.escape) {
      if (step === "editing") {
        setStep("menu");
        setEditingKey(null);
      } else {
        onClose();
      }
    }
  });

  if (step === "editing" && editingKey) {
    const config = SETTING_OPTIONS[editingKey];
    const currentIndex = config.options.findIndex(
      (opt) => opt.value === settings[editingKey]
    );

    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>{config.label}</Text>
        </Box>

        <SelectInput
          items={config.options}
          initialIndex={currentIndex >= 0 ? currentIndex : 0}
          onSelect={handleOptionSelect}
        />

        <Box marginTop={1}>
          <Text dimColor>Enter:select  Esc:back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Settings</Text>
      </Box>

      <SelectInput items={menuItems} onSelect={handleMenuSelect} />

      <Box marginTop={1}>
        <Text dimColor>Enter:edit  Esc:close</Text>
      </Box>
    </Box>
  );
}

function getCurrentValueLabel(key: SettingKey, settings: Settings): string {
  const config = SETTING_OPTIONS[key];
  const currentValue = settings[key];
  const option = config.options.find((opt) => opt.value === currentValue);
  return option?.label || String(currentValue);
}
```

### Step 4: Create Settings Context

Create `apps/cli/src/providers/settings-provider.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback } from "react";
import {
  getSettings,
  updateSettings as updateStoredSettings,
  type Settings,
} from "../lib/settings.js";

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}

interface SettingsProviderProps {
  children: React.ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState(getSettings);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    const updated = updateStoredSettings(updates);
    setSettings(updated);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

### Step 5: Update App Providers

Update `apps/cli/src/providers/index.tsx`:

```typescript
import React from "react";
import { QueryProvider } from "./query-provider.js";
import { CLIAuthProvider } from "./auth-provider.js";
import { SettingsProvider } from "./settings-provider.js";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <CLIAuthProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </CLIAuthProvider>
    </QueryProvider>
  );
}

export { useCLIAuth } from "./auth-provider.js";
export { queryClient } from "./query-provider.js";
export { useSettings } from "./settings-provider.js";
```

### Step 6: Update Chat App with Search and Settings

Update `apps/cli/src/commands/chat.tsx` to add search and settings views:

```typescript
// Add to imports
import { Search } from "../components/search.js";
import { SettingsView } from "../components/settings.js";
import { useSettings } from "../providers/index.js";

// Add to View type
type View = "list" | "chat" | "new-chat" | "actions" | "model-switch" | "search" | "settings";

// In ChatAppInner, add settings usage
const { settings } = useSettings();

// Add keyboard handling for search and settings
useInput((input, key) => {
  if (view !== "list") return;

  // ... existing handlers ...

  // Search
  if (input === "/" || (key.ctrl && input === "f")) {
    setView("search");
  }

  // Settings
  if (input === "s") {
    setView("settings");
  }
});

// Add view handlers
if (view === "search") {
  return (
    <Search
      onSelect={(conversationId) => {
        setSelectedConversationId(conversationId);
        setView("chat");
      }}
      onCancel={handleBackToList}
    />
  );
}

if (view === "settings") {
  return <SettingsView onClose={handleBackToList} />;
}

// Update footer
<Text dimColor>
  j/k:nav  Enter:open  n:new  /:search  s:settings  q:quit
</Text>
```

### Step 7: Apply Settings to Components

Update components to respect settings:

```typescript
// In message.tsx - respect showTimestamps
const { settings } = useSettings();

{settings.showTimestamps && (
  <Text dimColor> · {formatRelativeTime(message.createdAt)}</Text>
)}

// In new-chat-dialog.tsx - use defaultModel
const { settings } = useSettings();
// Pre-select settings.defaultModel in ModelSelector
```

## Files Created

```
apps/cli/src/
├── components/
│   ├── search.tsx
│   └── settings.tsx
├── lib/
│   └── settings.ts
└── providers/
    └── settings-provider.tsx
```

## Files Modified

```
apps/cli/src/providers/index.tsx (add SettingsProvider)
apps/cli/src/commands/chat.tsx (add search/settings views)
apps/cli/src/components/message.tsx (respect settings)
apps/cli/src/components/new-chat-dialog.tsx (use defaultModel)
```

## Checklist

- [ ] Create `Search` component with fuzzy matching
- [ ] Create settings storage (`lib/settings.ts`)
- [ ] Create `SettingsView` component
- [ ] Create `SettingsProvider` context
- [ ] Update `AppProviders` to include settings
- [ ] Add '/' keyboard shortcut for search
- [ ] Add 's' keyboard shortcut for settings
- [ ] Apply settings to message display
- [ ] Apply default model to new chats
- [ ] Test search flow
- [ ] Test settings persistence

## Testing

1. Press '/' to open search
2. Type to filter conversations
3. Navigate with arrows
4. Press Enter to open
5. Press Esc to cancel
6. Press 's' to open settings
7. Change default model
8. Verify it persists after restart
9. Create new chat - verify uses default model

## Next Phase

After this phase, proceed to [Phase 4C: Polish](./phase-4c-polish.md) for final keybindings and themes.
