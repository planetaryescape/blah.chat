# Project Context Tool

## Overview

Retrieve context from the user's active project. Leverage blah.chat's existing projects feature to give the LLM access to project-specific information.

---

## Priority

**🟢 INNOVATIVE** - Differentiator that leverages existing infrastructure.

---

## Use Cases

- "What are the requirements for this project?"
- "What did we decide about the database schema?"
- "Summarize the project context"
- "What's the tech stack for this project?"

---

## External Dependencies

**None** - Uses existing Convex database and projects feature.

---

## Implementation Complexity

**🟡 MEDIUM** - 2-3 hours

- Leverages existing projects infrastructure
- Need to integrate with generation context
- Consider context window budget

---

## Existing Infrastructure

blah.chat already has:
- Projects table with `systemPrompt` field
- Project-scoped conversations
- Project files/documents (if implemented)
- Project memories

This tool surfaces that data on-demand during chat.

---

## Tool Schema

```typescript
inputSchema: z.object({
  projectId: z.string().optional().describe(
    "Project ID to query (defaults to current conversation's project)"
  ),
  section: z.enum([
    "context",      // Full project context
    "notes",        // Project-specific notes
    "files",        // Attached files/documents
    "history",      // Recent project conversations (summaries)
  ]).optional().default("context"),
})
```

---

## Example Responses

```json
{
  "success": true,
  "project": {
    "name": "blah.chat",
    "description": "Personal AI chat assistant",
    "systemPrompt": "You are helping build a chat application...",
    "context": "Tech stack: Next.js 15, Convex, TypeScript..."
  }
}
```

---

## Tool Description

```
Retrieve context from the current or specified project.

✅ USE FOR:
- Understanding project requirements
- Recalling project decisions
- Getting project-specific context
- Reviewing attached documents

❌ DO NOT USE FOR:
- General knowledge questions
- User personal preferences (use memory tool)

Returns project name, description, context, and optionally files/notes.
```

---

## Implementation Code

```typescript
// convex/ai/tools/project-context.ts
import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";

export function createProjectContextTool(
  ctx: ActionCtx,
  userId: Id<"users">,
  conversationId?: Id<"conversations">
) {
  return tool({
    description: `Retrieve context from the current or specified project.

✅ USE FOR: Project requirements, decisions, context, documents
❌ DO NOT USE FOR: Personal preferences (use memory tool)

Returns project details and attached context.`,

    inputSchema: z.object({
      section: z.enum(["context", "notes", "files", "history"])
        .optional().default("context"),
    }),

    // @ts-ignore
    execute: async ({ section }) => {
      return await ctx.runAction(internal.tools.projectContext.get, {
        userId,
        conversationId,
        section,
      });
    },
  });
}

// convex/tools/projectContext.ts
import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

export const get = internalAction({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    section: v.string(),
  },
  handler: async (ctx, { userId, conversationId, section }) => {
    // 1. Get conversation's project
    let projectId = null;
    if (conversationId) {
      const conversation = await ctx.runQuery(
        internal.conversations.getInternal,
        { id: conversationId }
      );
      projectId = conversation?.projectId;
    }

    if (!projectId) {
      return {
        success: false,
        error: "No project associated with this conversation",
      };
    }

    // 2. Get project details
    const project = await ctx.runQuery(
      internal.projects.getInternal,
      { id: projectId }
    );

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // 3. Return requested section
    switch (section) {
      case "context":
        return {
          success: true,
          project: {
            name: project.name,
            description: project.description,
            systemPrompt: project.systemPrompt,
            context: project.context,
          },
        };

      case "notes":
        // Fetch project notes (if implemented)
        const notes = await ctx.runQuery(
          internal.notes.listByProject,
          { projectId }
        );
        return {
          success: true,
          project: { name: project.name },
          notes: notes.map(n => ({ title: n.title, content: n.content })),
        };

      case "files":
        // Fetch project files (if implemented)
        return {
          success: true,
          project: { name: project.name },
          files: [], // Placeholder
        };

      case "history":
        // Summarize recent conversations
        return {
          success: true,
          project: { name: project.name },
          recentConversations: [], // Placeholder
        };

      default:
        return { success: false, error: "Unknown section" };
    }
  },
});
```

---

## Integration with Generation

The tool needs the `conversationId` to determine which project to query:

```typescript
// In convex/generation.ts
if (hasFunctionCalling) {
  options.tools = {
    // ...other tools
    projectContext: createProjectContextTool(
      ctx,
      args.userId,
      args.conversationId  // Pass conversation ID
    ),
  };
}
```

---

## UI Display

- **Icon:** `Folder` or `FileStack` from lucide-react
- **Running:** "Loading project context..."
- **Complete:** "Project: {name}"
- **Expanded:** Show context snippet

---

## Future Enhancements

1. **Project file search**: Semantic search within project documents
2. **Decision history**: Track and recall project decisions
3. **Cross-project context**: Compare/reference other projects
4. **Project timeline**: Show project activity over time

---

## Testing Checklist

- [ ] "What is this project about?"
- [ ] "Show me the project requirements"
- [ ] "What's in the project context?"
- [ ] Test with no project (graceful error)
- [ ] Test with empty project context
