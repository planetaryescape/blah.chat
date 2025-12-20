# Phase 3: Deployment Pipeline

## Context

### What is BYOD?

BYOD (Bring Your Own Database) allows users to connect their own Convex instance. When they provide credentials, we deploy our schema and functions to their instance automatically.

### Overall Architecture

- **Main DB**: App operations (users, templates, settings)
- **User's DB**: Content (conversations, messages, memories, files)

Users provide their Convex deployment URL and deploy key. We then deploy the BYOD schema package to their instance.

### Where This Phase Fits

```
Phase 1: Foundation ✓
Phase 2: Schema Package ✓
         │
         ▼
[Phase 3: Deployment] ◄── YOU ARE HERE
         │
         ▼
Phase 4: DAL Routing
Phase 5: Migrations
Phase 6: Settings UI
Phase 7: Error Handling
Phase 8: Documentation
```

**Dependencies**: Phase 1 (credentials), Phase 2 (schema package)
**Unlocks**: Phase 4 (DAL routing), Phase 5 (migrations)

---

## Goal

Deploy the BYOD schema and functions to user's Convex instance programmatically.

---

## Deployment Strategy

### Primary Approach: Convex CLI

Use `npx convex deploy` with the user's deploy key. This is the most reliable method.

```bash
CONVEX_DEPLOY_KEY=<user_key> npx convex deploy --url <user_url>
```

### Fallback: Manual Deployment

If programmatic deployment fails, provide users with a downloadable project they can deploy themselves.

---

## Deliverables

### 1. Deployment Action

Create `/convex/byod/deploy.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { getCurrentUser } from "../lib/helpers";
import { decryptCredential } from "../lib/encryption";
import { spawn } from "child_process";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { BYOD_SCHEMA_VERSION } from "../../src/lib/byod/version";

// Main deployment action
export const deployToUserInstance = action({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Get config
    const config = await ctx.runQuery(internal.byod.credentials.getConfigInternal, {
      userId: user._id,
    });

    if (!config) {
      throw new Error("No BYOD configuration found");
    }

    // Update status to deploying
    await ctx.runMutation(internal.byod.credentials.updateConfig, {
      configId: config._id,
      deploymentStatus: "deploying",
      deploymentProgress: "Preparing deployment...",
      updatedAt: Date.now(),
    });

    try {
      // Decrypt credentials
      const [urlIv, keyIv] = config.encryptionIV.split(":");
      const [urlAuthTag, keyAuthTag] = config.authTags.split(":");

      const deploymentUrl = await decryptCredential(
        config.encryptedDeploymentUrl,
        urlIv,
        urlAuthTag
      );

      const deployKey = await decryptCredential(
        config.encryptedDeployKey,
        keyIv,
        keyAuthTag
      );

      // Update progress
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: config._id,
        deploymentProgress: "Generating schema files...",
        updatedAt: Date.now(),
      });

      // Create temporary project directory
      const tempDir = join(tmpdir(), `byod-deploy-${user._id}-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      try {
        // Generate and write project files
        await generateProjectFiles(tempDir);

        // Update progress
        await ctx.runMutation(internal.byod.credentials.updateConfig, {
          configId: config._id,
          deploymentProgress: "Deploying to Convex...",
          updatedAt: Date.now(),
        });

        // Run deployment
        await runConvexDeploy(tempDir, deploymentUrl, deployKey);

        // Update status to deployed
        await ctx.runMutation(internal.byod.credentials.updateConfig, {
          configId: config._id,
          connectionStatus: "connected",
          deploymentStatus: "deployed",
          deploymentProgress: "Deployment complete",
          schemaVersion: BYOD_SCHEMA_VERSION,
          lastSchemaDeploy: Date.now(),
          updatedAt: Date.now(),
        });

        return { success: true, message: "Deployment successful" };
      } finally {
        // Cleanup temp directory
        rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update status to failed
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: config._id,
        deploymentStatus: "failed",
        deploymentProgress: `Deployment failed: ${errorMessage}`,
        connectionError: errorMessage,
        updatedAt: Date.now(),
      });

      throw new Error(`Deployment failed: ${errorMessage}`);
    }
  },
});

// Generate project files in temp directory
async function generateProjectFiles(dir: string): Promise<void> {
  // Create convex directory
  const convexDir = join(dir, "convex");
  mkdirSync(convexDir, { recursive: true });

  // Write package.json
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "blah-chat-byod",
      version: "1.0.0",
      private: true,
      dependencies: {
        convex: "^1.17.0",
      },
    }, null, 2)
  );

  // Write convex.json
  writeFileSync(
    join(dir, "convex.json"),
    JSON.stringify({
      project: "byod-instance",
      team: "user",
      prodUrl: "",
    }, null, 2)
  );

  // Write schema.ts
  const schemaContent = generateFullSchema();
  writeFileSync(join(convexDir, "schema.ts"), schemaContent);

  // Write minimal functions
  const functionsContent = generateMinimalFunctions();
  writeFileSync(join(convexDir, "functions.ts"), functionsContent);

  // Write tsconfig.json
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
      },
      include: ["convex/**/*"],
    }, null, 2)
  );
}

// Run convex deploy command
function runConvexDeploy(
  dir: string,
  url: string,
  deployKey: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      CONVEX_DEPLOY_KEY: deployKey,
    };

    const child = spawn(
      "npx",
      ["convex", "deploy", "--url", url, "--yes"],
      {
        cwd: dir,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deploy failed (code ${code}): ${stderr || stdout}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start deploy: ${err.message}`));
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill();
      reject(new Error("Deployment timed out after 5 minutes"));
    }, 5 * 60 * 1000);
  });
}

// Generate full schema content
function generateFullSchema(): string {
  return `// BYOD Schema v${BYOD_SCHEMA_VERSION}
// Auto-generated by blah.chat - DO NOT EDIT

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Conversations
  conversations: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    lastMessageAt: v.optional(v.number()),
    messageCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_last_message", ["userId", "lastMessageAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  // Messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
      v.literal("stopped")
    )),
    partialContent: v.optional(v.string()),
    error: v.optional(v.string()),
    generationStartedAt: v.optional(v.number()),
    generationCompletedAt: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cost: v.optional(v.number()),
    parentMessageId: v.optional(v.id("messages")),
    branchIndex: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_user", ["userId"])
    .index("by_parent", ["parentMessageId"])
    .index("by_status", ["status"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "conversationId"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "conversationId"],
    }),

  // Memories
  memories: defineTable({
    userId: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.optional(v.union(
      v.literal("extracted"),
      v.literal("manual"),
      v.literal("imported")
    )),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    importance: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_user_category", ["userId", "category"])
    .index("by_source_conversation", ["sourceConversationId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "category"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "category", "isActive"],
    }),

  // Files
  files: defineTable({
    userId: v.string(),
    storageId: v.optional(v.id("_storage")),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    url: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    )),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  // Projects
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "isArchived"]),

  // Notes
  notes: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    isPinned: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_pinned", ["userId", "isPinned"])
    .index("by_user_archived", ["userId", "isArchived"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),

  // Tasks
  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("cancelled")
    ),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    sourceConversationId: v.optional(v.id("conversations")),
    sourceMessageId: v.optional(v.id("messages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_due", ["userId", "dueDate"])
    .index("by_source_conversation", ["sourceConversationId"]),

  // Bookmarks
  bookmarks: defineTable({
    userId: v.string(),
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"]),

  // Usage records
  usageRecords: defineTable({
    userId: v.string(),
    date: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    requestCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_model", ["userId", "model"]),

  // Add remaining tables...
});
`;
}

// Generate minimal functions for basic CRUD
function generateMinimalFunctions(): string {
  return `// BYOD Functions v${BYOD_SCHEMA_VERSION}
// Auto-generated by blah.chat

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Health check
export const ping = query({
  args: {},
  handler: async () => {
    return { status: "ok", version: ${BYOD_SCHEMA_VERSION} };
  },
});
`;
}
```

### 2. Retry Deployment Action

Add to `/convex/byod/deploy.ts`:

```typescript
// Retry a failed deployment
export const retryDeployment = action({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const config = await ctx.runQuery(internal.byod.credentials.getConfigInternal, {
      userId: user._id,
    });

    if (!config) {
      throw new Error("No BYOD configuration found");
    }

    if (config.deploymentStatus !== "failed") {
      throw new Error("Can only retry failed deployments");
    }

    // Reset and retry
    return await deployToUserInstance(ctx);
  },
});
```

### 3. Downloadable Project (Fallback)

Create `/src/lib/byod/downloadProject.ts`:

```typescript
import JSZip from "jszip";
import { BYOD_SCHEMA_VERSION } from "./version";

/**
 * Generate a downloadable zip file with the BYOD project
 * for users who need to deploy manually
 */
export async function generateDownloadableProject(): Promise<Blob> {
  const zip = new JSZip();

  // Add package.json
  zip.file("package.json", JSON.stringify({
    name: "blah-chat-byod",
    version: "1.0.0",
    private: true,
    scripts: {
      deploy: "npx convex deploy",
    },
    dependencies: {
      convex: "^1.17.0",
    },
  }, null, 2));

  // Add convex directory
  const convex = zip.folder("convex");

  // Add schema
  convex?.file("schema.ts", generateSchemaContent());

  // Add functions
  convex?.file("functions.ts", generateFunctionsContent());

  // Add README
  zip.file("README.md", generateReadme());

  return await zip.generateAsync({ type: "blob" });
}

function generateSchemaContent(): string {
  // Same as generateFullSchema() from deploy.ts
  return `// BYOD Schema v${BYOD_SCHEMA_VERSION}...`;
}

function generateFunctionsContent(): string {
  return `// Minimal functions...`;
}

function generateReadme(): string {
  return `# blah.chat BYOD Project

## Setup

1. Run \`npm install\`
2. Run \`npx convex dev\` to link to your project
3. Run \`npx convex deploy\` to deploy

## Notes

This project contains the schema for your blah.chat BYOD instance.
Do not modify the schema manually - updates are managed by blah.chat.
`;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/convex/byod/deploy.ts` | Create | Main deployment action |
| `/convex/schema.ts` | Modify | Add deployment status fields |
| `/src/lib/byod/downloadProject.ts` | Create | Fallback downloadable project |

---

## Testing Criteria

- [ ] Deployment creates valid Convex project
- [ ] Tables and indexes created correctly
- [ ] Vector indexes functional (1536 dimensions)
- [ ] Search indexes functional
- [ ] Deployment status updates in real-time
- [ ] Timeout after 5 minutes
- [ ] Cleanup temp files after deployment
- [ ] Error messages are descriptive
- [ ] Retry works for failed deployments
- [ ] Downloadable project works for manual deploy

---

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Invalid deploy key" | Wrong or expired key | User regenerates key in Convex dashboard |
| "Deployment timed out" | Network/Convex issues | Retry or try manual deployment |
| "Schema validation failed" | Bug in schema generation | Fix schema, redeploy |
| "Permission denied" | Key doesn't have deploy access | User checks key permissions |

---

## Security Considerations

1. **Credential Handling**
   - Deploy key only exists in memory during deployment
   - Temp files deleted immediately after use
   - Never log credentials

2. **Subprocess Security**
   - Use `spawn` instead of `exec` (no shell injection)
   - Timeout prevents runaway processes
   - Capture stderr for debugging

3. **Temp Directory**
   - Use unique directory per deployment
   - Clean up even on failure
   - Use OS temp directory (proper permissions)

---

## Next Phase

After completing Phase 3, proceed to [Phase 4: DAL Routing](./phase-4-dal-routing.md) to route queries between main and user databases.
