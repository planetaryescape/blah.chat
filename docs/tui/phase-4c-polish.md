# Phase 4C: Polish

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This is the final phase, adding polish: complete keybindings, color themes, and error handling.

### Project Background

- **Framework**: Ink (React for CLI)
- **Current State**: Full-featured chat client (Phases 1-4B complete)
- **Goal**: Production-ready polish

### What Came Before

- **Phase 4A**: Conversation management
- **Phase 4B**: Search and settings
- **Milestone 3**: Interactive chat with streaming

### What Comes After

This is the final phase of Milestone 4. After this, the TUI client is complete.

## Goal

Add final polish:
- Complete vim-style keybindings
- Color themes (matching web app)
- Proper error handling with retry
- Help screen
- Loading states

**Success criteria**: Professional-quality terminal experience.

## Prerequisites

- Phase 4B complete (search and settings work)

## Implementation

### Step 1: Create Keybindings Hook

Create `apps/cli/src/hooks/use-keybindings.ts`:

```typescript
import { useInput } from "ink";
import { useSettings } from "../providers/index.js";

interface KeybindingHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
  onQuit?: () => void;
  onNew?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onActions?: () => void;
  onModel?: () => void;
  onHelp?: () => void;
}

export function useKeybindings(handlers: KeybindingHandlers) {
  const { settings } = useSettings();
  const mode = settings.keyboardMode;

  useInput((input, key) => {
    // Navigation
    const isUp =
      key.upArrow ||
      (mode !== "arrows" && input === "k") ||
      (key.ctrl && input === "p");
    const isDown =
      key.downArrow ||
      (mode !== "arrows" && input === "j") ||
      (key.ctrl && input === "n");
    const isLeft = key.leftArrow || (mode !== "arrows" && input === "h");
    const isRight = key.rightArrow || (mode !== "arrows" && input === "l");

    if (isUp) handlers.onUp?.();
    if (isDown) handlers.onDown?.();
    if (isLeft) handlers.onLeft?.();
    if (isRight) handlers.onRight?.();

    // Actions
    if (key.return) handlers.onSelect?.();
    if (key.escape || (mode !== "arrows" && input === "q" && !key.ctrl)) {
      handlers.onBack?.();
    }
    if (key.ctrl && input === "c") handlers.onQuit?.();

    // Shortcuts
    if (input === "n") handlers.onNew?.();
    if (input === "/" || (key.ctrl && input === "f")) handlers.onSearch?.();
    if (input === "s" && !key.ctrl) handlers.onSettings?.();
    if (input === "a") handlers.onActions?.();
    if (input === "m") handlers.onModel?.();
    if (input === "?" || (key.shift && input === "/")) handlers.onHelp?.();
  });
}
```

### Step 2: Create Theme System

Create `apps/cli/src/lib/themes.ts`:

```typescript
export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  muted: string;
  background: string;
  foreground: string;
  userMessage: string;
  assistantMessage: string;
  border: string;
}

export const themes: Record<string, Theme> = {
  dark: {
    name: "Dark",
    primary: "cyan",
    secondary: "blue",
    accent: "magenta",
    success: "green",
    warning: "yellow",
    error: "red",
    muted: "gray",
    background: "black",
    foreground: "white",
    userMessage: "green",
    assistantMessage: "blue",
    border: "gray",
  },
  light: {
    name: "Light",
    primary: "blue",
    secondary: "cyan",
    accent: "magenta",
    success: "green",
    warning: "yellow",
    error: "red",
    muted: "gray",
    background: "white",
    foreground: "black",
    userMessage: "blue",
    assistantMessage: "magenta",
    border: "gray",
  },
  rosePine: {
    name: "Rosé Pine",
    primary: "#c4a7e7", // iris
    secondary: "#9ccfd8", // foam
    accent: "#ebbcba", // rose
    success: "#31748f", // pine
    warning: "#f6c177", // gold
    error: "#eb6f92", // love
    muted: "#6e6a86", // muted
    background: "#191724", // base
    foreground: "#e0def4", // text
    userMessage: "#9ccfd8",
    assistantMessage: "#c4a7e7",
    border: "#26233a",
  },
  tokyoNight: {
    name: "Tokyo Night",
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    accent: "#7dcfff",
    success: "#9ece6a",
    warning: "#e0af68",
    error: "#f7768e",
    muted: "#565f89",
    background: "#1a1b26",
    foreground: "#c0caf5",
    userMessage: "#9ece6a",
    assistantMessage: "#7aa2f7",
    border: "#3b4261",
  },
};

export function getTheme(themeName: string): Theme {
  return themes[themeName] || themes.dark;
}
```

### Step 3: Create Theme Context

Create `apps/cli/src/providers/theme-provider.tsx`:

```typescript
import React, { createContext, useContext, useMemo } from "react";
import { useSettings } from "./settings-provider.js";
import { getTheme, type Theme } from "../lib/themes.js";

const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings } = useSettings();
  const theme = useMemo(() => getTheme(settings.theme), [settings.theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Step 4: Create Help Screen

Create `apps/cli/src/components/help.tsx`:

```typescript
import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../providers/theme-provider.js";
import { useSettings } from "../providers/index.js";

interface HelpScreenProps {
  onClose: () => void;
}

export function HelpScreen({ onClose }: HelpScreenProps) {
  const theme = useTheme();
  const { settings } = useSettings();

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "?") {
      onClose();
    }
  });

  const showVim = settings.keyboardMode !== "arrows";
  const showArrows = settings.keyboardMode !== "vim";

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          blah.chat TUI - Keyboard Shortcuts
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Navigation</Text>
        <KeybindingRow
          action="Move up"
          vim={showVim ? "k" : undefined}
          arrows={showArrows ? "↑" : undefined}
        />
        <KeybindingRow
          action="Move down"
          vim={showVim ? "j" : undefined}
          arrows={showArrows ? "↓" : undefined}
        />
        <KeybindingRow
          action="Select/Open"
          vim="Enter"
          arrows="Enter"
        />
        <KeybindingRow
          action="Back/Cancel"
          vim={showVim ? "q, Esc" : undefined}
          arrows={showArrows ? "Esc" : undefined}
        />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Actions</Text>
        <KeybindingRow action="New chat" vim="n" arrows="n" />
        <KeybindingRow action="Search" vim="/" arrows="Ctrl+F" />
        <KeybindingRow action="Settings" vim="s" arrows="s" />
        <KeybindingRow action="Actions menu" vim="a" arrows="a" />
        <KeybindingRow action="Change model" vim="m" arrows="m" />
        <KeybindingRow action="This help" vim="?" arrows="?" />
        <KeybindingRow action="Quit" vim=":q" arrows="Ctrl+C" />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>In Chat</Text>
        <KeybindingRow action="Send message" vim="Enter" arrows="Enter" />
        <KeybindingRow action="Back to list" vim="Esc" arrows="Esc" />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Press Esc or ? to close</Text>
      </Box>
    </Box>
  );
}

interface KeybindingRowProps {
  action: string;
  vim?: string;
  arrows?: string;
}

function KeybindingRow({ action, vim, arrows }: KeybindingRowProps) {
  const keys = [vim, arrows].filter(Boolean).join(" / ");

  return (
    <Box>
      <Box width={20}>
        <Text>{action}</Text>
      </Box>
      <Text dimColor>{keys}</Text>
    </Box>
  );
}
```

### Step 5: Create Error Boundary

Create `apps/cli/src/components/error-boundary.tsx`:

```typescript
import React from "react";
import { Box, Text } from "ink";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CLI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="red" bold>
            Something went wrong
          </Text>
          <Text color="red">{this.state.error?.message}</Text>
          {this.props.onRetry && (
            <Box marginTop={1}>
              <Text dimColor>Press Enter to retry</Text>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}
```

### Step 6: Create Loading Component

Create `apps/cli/src/components/loading.tsx`:

```typescript
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useTheme } from "../providers/theme-provider.js";

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "Loading..." }: LoadingProps) {
  const theme = useTheme();

  return (
    <Box padding={1}>
      <Text color={theme.primary}>
        <Spinner type="dots" />
      </Text>
      <Text> {message}</Text>
    </Box>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({
  isLoading,
  message,
  children,
}: LoadingOverlayProps) {
  if (isLoading) {
    return <Loading message={message} />;
  }

  return <>{children}</>;
}
```

### Step 7: Update App Providers with Theme

Update `apps/cli/src/providers/index.tsx`:

```typescript
import React from "react";
import { QueryProvider } from "./query-provider.js";
import { CLIAuthProvider } from "./auth-provider.js";
import { SettingsProvider } from "./settings-provider.js";
import { ThemeProvider } from "./theme-provider.js";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <CLIAuthProvider>
        <SettingsProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SettingsProvider>
      </CLIAuthProvider>
    </QueryProvider>
  );
}

export { useCLIAuth } from "./auth-provider.js";
export { queryClient } from "./query-provider.js";
export { useSettings } from "./settings-provider.js";
export { useTheme } from "./theme-provider.js";
```

### Step 8: Update Chat App with Help and Error Handling

Update `apps/cli/src/commands/chat.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useApp } from "ink";
import { AppProviders, useCLIAuth, useTheme } from "../providers/index.js";
import { ConversationList } from "../components/conversation-list.js";
import { ChatView } from "../components/chat-view.js";
import { NewChatDialog } from "../components/new-chat-dialog.js";
import { ConversationActions } from "../components/conversation-actions.js";
import { ModelSelector } from "../components/model-selector.js";
import { Search } from "../components/search.js";
import { SettingsView } from "../components/settings.js";
import { HelpScreen } from "../components/help.js";
import { ErrorBoundary } from "../components/error-boundary.js";
import { useKeybindings } from "../hooks/use-keybindings.js";
import { useConversations } from "@blah-chat/hooks";

type View =
  | "list"
  | "chat"
  | "new-chat"
  | "actions"
  | "model-switch"
  | "search"
  | "settings"
  | "help";

function ChatAppInner() {
  const { exit } = useApp();
  const { isAuthenticated, credentials } = useCLIAuth();
  const { data: conversations } = useConversations();
  const theme = useTheme();

  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const selectedConversation = conversations?.[selectedIndex];

  useKeybindings({
    onUp: () => {
      if (view === "list") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    },
    onDown: () => {
      if (view === "list") {
        setSelectedIndex((prev) =>
          Math.min(prev + 1, (conversations?.length ?? 1) - 1)
        );
      }
    },
    onSelect: () => {
      if (view === "list" && selectedConversation) {
        setSelectedConversationId(selectedConversation._id);
        setView("chat");
      }
    },
    onBack: () => {
      if (view === "list") {
        exit();
      } else {
        handleBackToList();
      }
    },
    onQuit: () => exit(),
    onNew: () => view === "list" && setView("new-chat"),
    onSearch: () => view === "list" && setView("search"),
    onSettings: () => view === "list" && setView("settings"),
    onActions: () => {
      if (view === "list" && selectedConversation) {
        setSelectedConversationId(selectedConversation._id);
        setView("actions");
      }
    },
    onModel: () => {
      if (view === "list" && selectedConversation) {
        setSelectedConversationId(selectedConversation._id);
        setView("model-switch");
      }
    },
    onHelp: () => setView("help"),
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
        <Text color={theme.warning}>Not logged in</Text>
        <Text color={theme.muted}>Run: blah login</Text>
      </Box>
    );
  }

  // View routing
  switch (view) {
    case "help":
      return <HelpScreen onClose={handleBackToList} />;

    case "search":
      return (
        <Search
          onSelect={(conversationId) => {
            setSelectedConversationId(conversationId);
            setView("chat");
          }}
          onCancel={handleBackToList}
        />
      );

    case "settings":
      return <SettingsView onClose={handleBackToList} />;

    case "new-chat":
      return (
        <NewChatDialog
          onCreated={handleNewChatCreated}
          onCancel={handleBackToList}
        />
      );

    case "actions":
      if (selectedConversationId && selectedConversation) {
        return (
          <ConversationActions
            conversationId={selectedConversationId}
            isArchived={selectedConversation.archived}
            onClose={handleBackToList}
            onDeleted={handleBackToList}
          />
        );
      }
      break;

    case "model-switch":
      if (selectedConversation) {
        return (
          <ModelSelector
            currentModel={selectedConversation.model}
            onSelect={async () => handleBackToList()}
            onCancel={handleBackToList}
          />
        );
      }
      break;

    case "chat":
      if (selectedConversationId) {
        return (
          <ChatView
            conversationId={selectedConversationId}
            onBack={handleBackToList}
          />
        );
      }
      break;
  }

  // Default: List view
  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          blah.chat
        </Text>
        <Text color={theme.muted}> — {credentials?.email}</Text>
      </Box>

      {/* Conversation List */}
      <Box flexDirection="column" flexGrow={1}>
        <ConversationList selectedIndex={selectedIndex} />
      </Box>

      {/* Footer */}
      <Box
        marginTop={1}
        borderStyle="single"
        borderColor={theme.border}
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text color={theme.muted}>
          j/k:nav Enter:open n:new /:search s:settings ?:help q:quit
        </Text>
      </Box>
    </Box>
  );
}

export function ChatApp() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <ChatAppInner />
      </ErrorBoundary>
    </AppProviders>
  );
}
```

### Step 9: Final Testing

```bash
# Rebuild CLI
cd apps/cli && bun run build

# Test all features
blah
```

## Files Created

```
apps/cli/src/
├── hooks/
│   └── use-keybindings.ts
├── lib/
│   └── themes.ts
├── providers/
│   └── theme-provider.tsx
└── components/
    ├── help.tsx
    ├── error-boundary.tsx
    └── loading.tsx
```

## Files Modified

```
apps/cli/src/providers/index.tsx (add ThemeProvider)
apps/cli/src/commands/chat.tsx (use keybindings, add help)
apps/cli/src/components/*.tsx (apply theme colors)
```

## Checklist

- [ ] Create `useKeybindings` hook
- [ ] Create theme system with multiple themes
- [ ] Create `ThemeProvider`
- [ ] Create `HelpScreen` component
- [ ] Create `ErrorBoundary` component
- [ ] Create `Loading` component
- [ ] Update all components to use theme
- [ ] Add '?' shortcut for help
- [ ] Apply error boundary to app
- [ ] Test all keyboard shortcuts
- [ ] Test theme switching
- [ ] Test error handling

## Testing

1. Press '?' to see help screen
2. Navigate with both vim keys and arrows
3. Test all shortcuts work
4. Change theme in settings
5. Verify colors change
6. Cause an error (disconnect network)
7. Verify error displays nicely

## Completion

Congratulations! The blah.chat TUI client is now complete with:

- Authentication (Phase 1B)
- Conversation viewing (Phase 2A-2B)
- Message sending with streaming (Phase 3A-3B)
- Conversation management (Phase 4A)
- Search and settings (Phase 4B)
- Polish and keybindings (Phase 4C)

### Summary of Features

- **Login**: `blah login` with browser OAuth
- **View**: Conversation list with navigation
- **Chat**: Send messages, see streaming responses
- **Manage**: Create, archive, delete conversations
- **Search**: Fuzzy search across all conversations
- **Settings**: Default model, keyboard mode, themes
- **Help**: Full keyboard shortcut reference

### Publishing

To publish the CLI:

```bash
cd apps/cli
npm publish --access public
```

Users can then install with:

```bash
npm install -g @blah-chat/cli
blah login
blah
```
