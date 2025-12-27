# Phase 5: CLI, TUI, and Raycast Extension (Future)

## Overview

This phase creates additional apps for terminal and launcher users: a CLI for quick commands, a TUI for interactive terminal sessions, and a Raycast extension for macOS users.

**Risk Level**: Low-Medium (Node.js environments, well-documented patterns)
**Prerequisite**: Phase 1-3 complete (monorepo foundation, all shared packages)
**Blocks**: None
**Status**: Future - implement when these tools are prioritized

---

## Context

### Monorepo State (After Phase 1-3)

```
blah.chat/
├── apps/
│   ├── web/                  # Next.js 15
│   └── mobile/               # Expo (if Phase 4 complete)
├── packages/
│   ├── backend/              # @blah-chat/backend - Convex
│   ├── ai/                   # @blah-chat/ai - Models, prompts
│   ├── shared/               # @blah-chat/shared - Utilities
│   └── config/               # @blah-chat/config - Shared configs
└── ...
```

### Target State

```
blah.chat/
├── apps/
│   ├── web/
│   ├── mobile/
│   ├── cli/                  # Node.js CLI (NEW)
│   ├── tui/                  # Terminal UI (NEW)
│   └── raycast/              # Raycast extension (NEW)
├── packages/
│   └── ...                   # Unchanged
└── ...
```

---

## App Overviews

### CLI (`apps/cli`)

**Purpose**: Quick terminal commands for power users

**Use Cases**:
- `blah chat "What is the weather?"` - Quick one-off query
- `blah history` - List recent conversations
- `blah config set model gpt-4o` - Configure defaults
- `blah export <id>` - Export conversation

**Technology**: Node.js + Commander.js or oclif

### TUI (`apps/tui`)

**Purpose**: Full interactive terminal experience

**Use Cases**:
- SSH into server, run `blah` for full chat experience
- Keyboard-driven navigation
- Split panes for multiple conversations
- Vim-like keybindings

**Technology**: Node.js + ink (React for terminals) or blessed

### Raycast Extension (`apps/raycast`)

**Purpose**: Quick access from Raycast launcher on macOS

**Use Cases**:
- Cmd+Space → "blah" → type question → get answer
- Search conversation history
- Quick model switching
- Copy response to clipboard

**Technology**: Raycast API + React

---

## Shared Infrastructure

All three apps use the same Convex backend via `ConvexHttpClient`:

```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "@blah-chat/backend/_generated/api";
import { MODEL_CONFIG } from "@blah-chat/ai";
import { formatEntity } from "@blah-chat/shared";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

// Query
const conversations = await client.query(api.conversations.list);

// Mutation
await client.mutation(api.chat.sendMessage, {
  conversationId,
  content: "Hello",
  model: "openai:gpt-4o",
});
```

---

## Part A: CLI App

### Task 5A.1: Create CLI Package

```bash
mkdir -p apps/cli/src
cd apps/cli
bun init
```

**`apps/cli/package.json`**:
```json
{
  "name": "@blah-chat/cli",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "blah": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup src/index.ts --format esm --dts",
    "start": "node dist/index.js",
    "lint": "biome check ."
  },
  "dependencies": {
    "@blah-chat/ai": "workspace:*",
    "@blah-chat/backend": "workspace:*",
    "@blah-chat/shared": "workspace:*",
    "commander": "^12.0.0",
    "convex": "^1.31.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Task 5A.2: Create CLI Entry Point

**`apps/cli/src/index.ts`**:
```typescript
#!/usr/bin/env node
import { program } from "commander";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@blah-chat/backend/_generated/api";
import { MODEL_CONFIG } from "@blah-chat/ai";
import chalk from "chalk";
import ora from "ora";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

program
  .name("blah")
  .description("blah.chat CLI - Chat with AI from your terminal")
  .version("0.0.0");

program
  .command("chat <message>")
  .description("Send a message and get a response")
  .option("-m, --model <model>", "Model to use", "openai:gpt-4o")
  .action(async (message, options) => {
    const spinner = ora("Thinking...").start();

    try {
      // Create or get default conversation
      const conversationId = await client.mutation(
        api.conversations.getOrCreateDefault
      );

      // Send message
      await client.mutation(api.chat.sendMessage, {
        conversationId,
        content: message,
        model: options.model,
      });

      // Poll for response (simplified - real impl would use subscriptions)
      const messages = await client.query(api.messages.list, {
        conversationId,
      });

      const lastMessage = messages[messages.length - 1];
      spinner.stop();

      console.log(chalk.green("Assistant:"), lastMessage.content);
    } catch (error) {
      spinner.fail("Error");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

program
  .command("models")
  .description("List available models")
  .action(() => {
    console.log(chalk.bold("Available Models:\n"));
    Object.entries(MODEL_CONFIG).forEach(([id, config]) => {
      console.log(`  ${chalk.cyan(id)} - ${config.name}`);
    });
  });

program
  .command("history")
  .description("List recent conversations")
  .option("-n, --limit <number>", "Number of conversations", "10")
  .action(async (options) => {
    const conversations = await client.query(api.conversations.list, {
      limit: parseInt(options.limit),
    });

    conversations.forEach((conv) => {
      console.log(`${chalk.dim(conv._id)} ${conv.title || "Untitled"}`);
    });
  });

program.parse();
```

### Task 5A.3: Configure TypeScript

**`apps/cli/tsconfig.json`**:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@blah-chat/ai": ["../../packages/ai/src/index.ts"],
      "@blah-chat/shared": ["../../packages/shared/src/index.ts"],
      "@blah-chat/backend/*": ["../../packages/backend/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Part B: TUI App

### Task 5B.1: Create TUI Package

```bash
mkdir -p apps/tui/src
cd apps/tui
bun init
```

**`apps/tui/package.json`**:
```json
{
  "name": "@blah-chat/tui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "blah-tui": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx watch src/index.tsx",
    "build": "tsup src/index.tsx --format esm --dts",
    "start": "node dist/index.js",
    "lint": "biome check ."
  },
  "dependencies": {
    "@blah-chat/ai": "workspace:*",
    "@blah-chat/backend": "workspace:*",
    "@blah-chat/shared": "workspace:*",
    "convex": "^1.31.0",
    "ink": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.2.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Task 5B.2: Create TUI Entry Point

**`apps/tui/src/index.tsx`**:
```typescript
#!/usr/bin/env node
import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@blah-chat/backend/_generated/api";
import type { Doc } from "@blah-chat/backend/_generated/dataModel";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

function App() {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Doc<"messages">[]>([]);
  const [loading, setLoading] = useState(false);

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
    }
  });

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    setInput("");
    setLoading(true);

    try {
      // Send message logic here
      // Poll for response
      // Update messages state
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" padding={1}>
        <Text bold color="cyan">blah.chat TUI</Text>
      </Box>

      <Box flexDirection="column" marginY={1}>
        {messages.map((msg) => (
          <Box key={msg._id} marginY={0}>
            <Text color={msg.role === "user" ? "green" : "blue"}>
              {msg.role === "user" ? "You: " : "AI: "}
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}
      </Box>

      {loading && <Text color="yellow">Thinking...</Text>}

      <Box>
        <Text color="green">{">"} </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type a message..."
        />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}

render(<App />);
```

---

## Part C: Raycast Extension

### Task 5C.1: Create Raycast Package

```bash
mkdir -p apps/raycast/src
cd apps/raycast
```

**`apps/raycast/package.json`**:
```json
{
  "name": "@blah-chat/raycast",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "ray develop",
    "build": "ray build -e dist",
    "lint": "ray lint"
  },
  "dependencies": {
    "@blah-chat/ai": "workspace:*",
    "@blah-chat/backend": "workspace:*",
    "@blah-chat/shared": "workspace:*",
    "@raycast/api": "^1.0.0",
    "@raycast/utils": "^1.0.0",
    "convex": "^1.31.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Task 5C.2: Create Raycast Manifest

**`apps/raycast/package.json`** (Raycast-specific fields):
```json
{
  "commands": [
    {
      "name": "chat",
      "title": "Chat with AI",
      "description": "Send a message to blah.chat",
      "mode": "view"
    },
    {
      "name": "history",
      "title": "Conversation History",
      "description": "Browse past conversations",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "convexUrl",
      "type": "textfield",
      "required": true,
      "title": "Convex URL",
      "description": "Your Convex deployment URL"
    },
    {
      "name": "defaultModel",
      "type": "dropdown",
      "required": false,
      "title": "Default Model",
      "description": "Default AI model to use",
      "data": [
        { "title": "GPT-4o", "value": "openai:gpt-4o" },
        { "title": "Claude 3.5 Sonnet", "value": "anthropic:claude-3-5-sonnet" }
      ]
    }
  ]
}
```

### Task 5C.3: Create Chat Command

**`apps/raycast/src/chat.tsx`**:
```typescript
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@blah-chat/backend/_generated/api";
import { MODEL_CONFIG } from "@blah-chat/ai";

interface Preferences {
  convexUrl: string;
  defaultModel?: string;
}

export default function ChatCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const client = new ConvexHttpClient(preferences.convexUrl);

  async function handleSubmit(values: { message: string; model: string }) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending message...",
    });

    try {
      const conversationId = await client.mutation(
        api.conversations.getOrCreateDefault
      );

      await client.mutation(api.chat.sendMessage, {
        conversationId,
        content: values.message,
        model: values.model,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Message sent!";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="message" title="Message" placeholder="Ask anything..." />
      <Form.Dropdown id="model" title="Model" defaultValue={preferences.defaultModel}>
        {Object.entries(MODEL_CONFIG).map(([id, config]) => (
          <Form.Dropdown.Item key={id} value={id} title={config.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
```

---

## Verification Checklist

### CLI
- [ ] `bun install` from root succeeds
- [ ] `cd apps/cli && bun run build` creates dist/
- [ ] `blah chat "test"` sends message and shows response
- [ ] `blah models` lists available models
- [ ] `blah history` shows recent conversations

### TUI
- [ ] `cd apps/tui && bun run dev` launches interactive UI
- [ ] Can type and send messages
- [ ] Responses display correctly
- [ ] Ctrl+C exits cleanly

### Raycast
- [ ] `cd apps/raycast && bun run dev` opens in Raycast
- [ ] Chat command appears in Raycast
- [ ] Can send messages and see responses
- [ ] Model selection works

---

## Authentication

### Option A: API Key (Simplest)

Generate a personal API key stored in environment:
```bash
export BLAH_API_KEY=blah_...
```

CLI/TUI authenticate with this key.

### Option B: OAuth Device Flow

1. CLI runs `blah login`
2. Opens browser for authentication
3. Stores token in `~/.config/blah/credentials.json`
4. Subsequent commands use stored token

### Option C: Clerk JWT (if using Clerk)

Use Clerk's machine-to-machine tokens for CLI authentication.

---

## Common Issues

### Issue: "Cannot find module 'convex/browser'"
**Solution**: Ensure `convex` package installed in app.

### Issue: "CONVEX_URL not set"
**Solution**: Set environment variable or use config file.

### Issue: "Raycast extension not loading"
**Solution**: Run `ray develop` from `apps/raycast/` directory.

### Issue: "ink not rendering correctly"
**Solution**: Ensure terminal supports ANSI colors. Try different terminal.

---

## What Comes Before

**Phase 1-3** must be complete:
- Monorepo structure established
- `@blah-chat/backend` with Convex types
- `@blah-chat/ai` with model configs
- `@blah-chat/shared` with utilities

**Phase 4 (Mobile)** is optional - CLI/TUI/Raycast are independent.

---

## Future Enhancements

- **Real-time streaming** - Use SSE for streaming responses in CLI/TUI
- **Conversation continuity** - Resume conversations across apps
- **Offline support** - Queue messages when offline
- **Plugins** - Extensible CLI commands
- **Themes** - Customizable TUI colors
- **Raycast AI** - Integration with Raycast AI features
