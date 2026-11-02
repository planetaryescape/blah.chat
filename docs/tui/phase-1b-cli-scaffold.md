# Phase 1B: CLI Scaffold + Authentication

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase creates the CLI application structure and implements browser-based OAuth authentication (like `gh` CLI).

### Project Background

- **Framework**: Ink (React for CLI) - same as Claude Code
- **Shared Hooks**: `@blah-chat/hooks` package created in Phase 1A
- **Auth**: Clerk (same as web app)
- **Goal**: `blah login` opens browser, stores token locally

### What Came Before

- **Phase 1A**: Created `@blah-chat/hooks` package with injectable auth

### What Comes After

- **Phase 2A**: Wire up hooks to display conversation list
- **Phase 2B**: Message viewing with navigation

## Goal

Create CLI application with working authentication:
- `blah login` - Opens browser for Clerk OAuth, stores token
- `blah logout` - Clears stored credentials
- `blah whoami` - Shows current user info

**Success criteria**: Run `blah login`, authenticate in browser, run `blah whoami` to see user.

## Prerequisites

- Phase 1A complete (`@blah-chat/hooks` package exists)
- Clerk account configured (same as web app)
- Node.js 18+ installed

## Implementation

### Step 1: Create CLI Directory Structure

```bash
mkdir -p apps/cli/src/{commands,components,hooks,lib}
mkdir -p apps/cli/bin
```

### Step 2: Create Package Configuration

Create `apps/cli/package.json`:

```json
{
  "name": "@blah-chat/cli",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "bin": {
    "blah": "./bin/blah.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node ./dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@blah-chat/hooks": "workspace:*",
    "@blah-chat/backend": "workspace:*",
    "@clerk/clerk-sdk-node": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "commander": "^12.0.0",
    "conf": "^13.0.0",
    "convex": "^1.17.0",
    "ink": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "open": "^10.0.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create `apps/cli/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Create CLI Entry Point

Create `apps/cli/bin/blah.js`:

```javascript
#!/usr/bin/env node
import "../dist/index.js";
```

Create `apps/cli/src/index.tsx`:

```typescript
import { Command } from "commander";
import { render } from "ink";
import React from "react";
import { LoginCommand } from "./commands/login.js";
import { LogoutCommand } from "./commands/logout.js";
import { WhoamiCommand } from "./commands/whoami.js";
import { ChatApp } from "./commands/chat.js";
import { getCredentials } from "./lib/auth.js";

const program = new Command();

program
  .name("blah")
  .description("Terminal client for blah.chat")
  .version("0.0.1");

program
  .command("login")
  .description("Authenticate with blah.chat")
  .action(async () => {
    const { waitUntilExit } = render(<LoginCommand />);
    await waitUntilExit();
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(async () => {
    const { waitUntilExit } = render(<LogoutCommand />);
    await waitUntilExit();
  });

program
  .command("whoami")
  .description("Show current user")
  .action(async () => {
    const { waitUntilExit } = render(<WhoamiCommand />);
    await waitUntilExit();
  });

// Default command: open chat UI
program
  .command("chat", { isDefault: true })
  .description("Open chat interface")
  .action(async () => {
    const credentials = getCredentials();
    if (!credentials) {
      console.error("Not logged in. Run: blah login");
      process.exit(1);
    }
    const { waitUntilExit } = render(<ChatApp />);
    await waitUntilExit();
  });

program.parse();
```

### Step 4: Create Credential Storage

Create `apps/cli/src/lib/auth.ts`:

```typescript
import Conf from "conf";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import http from "node:http";
import { URL } from "node:url";
import open from "open";

interface Credentials {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  email: string;
  name: string;
}

const config = new Conf<{ credentials?: Credentials }>({
  projectName: "blah-chat",
  projectVersion: "1.0.0",
});

const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function getCredentials(): Credentials | null {
  const creds = config.get("credentials");
  if (!creds) return null;

  // Check if expired (with 5 min buffer)
  if (creds.expiresAt < Date.now() + 5 * 60 * 1000) {
    // Token expired or expiring soon
    return null;
  }

  return creds;
}

export function saveCredentials(credentials: Credentials): void {
  config.set("credentials", credentials);
}

export function clearCredentials(): void {
  config.delete("credentials");
}

export function getConfigPath(): string {
  return config.path;
}

/**
 * Start OAuth flow by opening browser and waiting for callback.
 */
export async function startOAuthFlow(): Promise<Credentials> {
  return new Promise((resolve, reject) => {
    const PORT = 9876;
    const CALLBACK_PATH = "/oauth/callback";

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${PORT}`);

      if (url.pathname === CALLBACK_PATH) {
        const token = url.searchParams.get("token");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>Authentication Failed</h1>
                <p>${error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error(error));
          return;
        }

        if (!token) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>Authentication Failed</h1>
                <p>No token received.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(new Error("No token received"));
          return;
        }

        // Decode and validate the token
        try {
          const clerk = createClerkClient({
            secretKey: CLERK_SECRET_KEY,
            publishableKey: CLERK_PUBLISHABLE_KEY,
          });

          // Verify the session token
          const session = await clerk.verifyToken(token);

          const credentials: Credentials = {
            token,
            expiresAt: session.exp * 1000, // Convert to ms
            userId: session.sub,
            email: session.email || "",
            name: session.name || session.email || "User",
          };

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>Authentication Successful!</h1>
                <p>Welcome, ${credentials.name}!</p>
                <p>You can close this window and return to the terminal.</p>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);

          server.close();
          resolve(credentials);
        } catch (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>Authentication Failed</h1>
                <p>Could not verify token.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          server.close();
          reject(err);
        }
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(PORT, () => {
      // Open browser to web app's CLI login page
      const loginUrl = `${APP_URL}/cli-login?callback=http://localhost:${PORT}${CALLBACK_PATH}`;
      open(loginUrl);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out"));
    }, 5 * 60 * 1000);
  });
}
```

### Step 5: Create Login Command

Create `apps/cli/src/commands/login.tsx`:

```typescript
import React, { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import {
  startOAuthFlow,
  saveCredentials,
  getCredentials,
} from "../lib/auth.js";

type LoginState = "checking" | "opening" | "waiting" | "success" | "error";

export function LoginCommand() {
  const { exit } = useApp();
  const [state, setState] = useState<LoginState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function login() {
      // Check if already logged in
      const existing = getCredentials();
      if (existing) {
        setUserName(existing.name);
        setState("success");
        setTimeout(() => exit(), 1000);
        return;
      }

      setState("opening");

      try {
        setState("waiting");
        const credentials = await startOAuthFlow();
        saveCredentials(credentials);
        setUserName(credentials.name);
        setState("success");
        setTimeout(() => exit(), 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setState("error");
        setTimeout(() => exit(new Error("Login failed")), 2000);
      }
    }

    login();
  }, [exit]);

  return (
    <Box flexDirection="column" padding={1}>
      {state === "checking" && (
        <Box>
          <Spinner type="dots" />
          <Text> Checking existing credentials...</Text>
        </Box>
      )}

      {state === "opening" && (
        <Box>
          <Spinner type="dots" />
          <Text> Opening browser for authentication...</Text>
        </Box>
      )}

      {state === "waiting" && (
        <Box flexDirection="column">
          <Box>
            <Spinner type="dots" />
            <Text> Waiting for authentication...</Text>
          </Box>
          <Text dimColor>
            Complete the login in your browser. This will timeout in 5 minutes.
          </Text>
        </Box>
      )}

      {state === "success" && (
        <Box>
          <Text color="green">✓</Text>
          <Text> Logged in as </Text>
          <Text bold>{userName}</Text>
        </Box>
      )}

      {state === "error" && (
        <Box>
          <Text color="red">✗</Text>
          <Text color="red"> Login failed: {error}</Text>
        </Box>
      )}
    </Box>
  );
}
```

### Step 6: Create Logout Command

Create `apps/cli/src/commands/logout.tsx`:

```typescript
import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { clearCredentials, getCredentials } from "../lib/auth.js";

export function LogoutCommand() {
  const { exit } = useApp();

  useEffect(() => {
    const existing = getCredentials();

    if (!existing) {
      // Already logged out
      setTimeout(() => exit(), 500);
      return;
    }

    clearCredentials();
    setTimeout(() => exit(), 500);
  }, [exit]);

  const wasLoggedIn = getCredentials() !== null;

  return (
    <Box padding={1}>
      {wasLoggedIn ? (
        <>
          <Text color="green">✓</Text>
          <Text> Logged out successfully</Text>
        </>
      ) : (
        <Text dimColor>Not logged in</Text>
      )}
    </Box>
  );
}
```

### Step 7: Create Whoami Command

Create `apps/cli/src/commands/whoami.tsx`:

```typescript
import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { getCredentials, getConfigPath } from "../lib/auth.js";

export function WhoamiCommand() {
  const { exit } = useApp();
  const credentials = getCredentials();

  useEffect(() => {
    setTimeout(() => exit(), 100);
  }, [exit]);

  if (!credentials) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Not logged in</Text>
        <Text dimColor>Run: blah login</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text dimColor>User: </Text>
        <Text bold>{credentials.name}</Text>
      </Box>
      <Box>
        <Text dimColor>Email: </Text>
        <Text>{credentials.email}</Text>
      </Box>
      <Box>
        <Text dimColor>Config: </Text>
        <Text dimColor>{getConfigPath()}</Text>
      </Box>
    </Box>
  );
}
```

### Step 8: Create Placeholder Chat Command

Create `apps/cli/src/commands/chat.tsx`:

```typescript
import React from "react";
import { Box, Text, useApp, useInput } from "ink";

export function ChatApp() {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">blah.chat TUI</Text>
      <Text dimColor>Chat functionality coming in Phase 2</Text>
      <Text dimColor>Press 'q' or Esc to exit</Text>
    </Box>
  );
}
```

### Step 9: Create Web App CLI Login Page

Create `apps/web/src/app/cli-login/page.tsx`:

```typescript
"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CLILoginPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "redirecting" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get("callback");

  useEffect(() => {
    async function handleAuth() {
      if (!isLoaded) return;

      if (!callbackUrl) {
        setError("Missing callback URL");
        setStatus("error");
        return;
      }

      if (!isSignedIn) {
        // Redirect to sign in, then back here
        router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
        return;
      }

      try {
        // Get token for CLI
        const token = await getToken({ template: "convex" });

        if (!token) {
          throw new Error("Could not get authentication token");
        }

        // Redirect to callback with token
        setStatus("redirecting");
        const url = new URL(callbackUrl);
        url.searchParams.set("token", token);
        window.location.href = url.toString();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
        setStatus("error");
      }
    }

    handleAuth();
  }, [isLoaded, isSignedIn, callbackUrl, getToken, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Authenticating for CLI...</p>
        </div>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Authentication successful!</p>
          <p className="text-muted-foreground">Redirecting back to terminal...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Authentication Failed</p>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

### Step 10: Environment Variables

Create `apps/cli/.env.example`:

```bash
# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### Step 11: Build and Test

```bash
# Install dependencies
cd apps/cli && bun install

# Build
bun run build

# Link globally for testing
bun link

# Test commands
blah --help
blah login
blah whoami
blah logout
```

## Files Created

```
apps/cli/
├── package.json
├── tsconfig.json
├── .env.example
├── bin/
│   └── blah.js
└── src/
    ├── index.tsx
    ├── commands/
    │   ├── login.tsx
    │   ├── logout.tsx
    │   ├── whoami.tsx
    │   └── chat.tsx
    └── lib/
        └── auth.ts

apps/web/src/app/cli-login/
└── page.tsx
```

## Checklist

- [ ] Create `apps/cli/` directory structure
- [ ] Create `package.json` with dependencies
- [ ] Create `tsconfig.json` for TypeScript
- [ ] Create `bin/blah.js` entry point
- [ ] Create `src/index.tsx` with Commander setup
- [ ] Implement credential storage (`lib/auth.ts`)
- [ ] Implement OAuth flow with local callback server
- [ ] Create `LoginCommand` component
- [ ] Create `LogoutCommand` component
- [ ] Create `WhoamiCommand` component
- [ ] Create placeholder `ChatApp` component
- [ ] Create web app `/cli-login` page
- [ ] Add environment variables
- [ ] Build and test CLI
- [ ] Verify `blah login` → `blah whoami` flow works

## Testing

1. Run `blah login`
2. Browser opens to web app
3. Sign in with Clerk
4. Browser shows "Authentication Successful"
5. Terminal shows "Logged in as [name]"
6. Run `blah whoami` - shows user info
7. Run `blah logout` - clears credentials
8. Run `blah whoami` - shows "Not logged in"

## Next Phase

After this phase, proceed to [Phase 2A: Convex Integration](./phase-2a-convex-integration.md) to wire up the shared hooks and display conversation data.
