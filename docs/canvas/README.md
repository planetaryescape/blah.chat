# Canvas Feature Implementation

## Overview

Canvas is a split-screen document editor that appears alongside chat for collaborative writing and coding tasks. Similar to ChatGPT Canvas and Claude Artifacts, this feature keeps chat lean while enabling LLM-assisted document editing via diffs rather than full rewrites.

## Why Canvas?

| Without Canvas | With Canvas |
|---------------|-------------|
| LLM rewrites full document in each message | LLM sends targeted diffs |
| Long documents clutter chat | Documents live in dedicated editor |
| User edits require copy-paste | User edits directly in editor |
| No version history | Full undo/redo support |
| Context wasted on repeated content | Context used efficiently |

## Key Features

- **Split-screen UI**: Chat on left, Monaco editor on right
- **Diff-based editing**: LLM sends line-level changes, not full rewrites
- **User + LLM collaboration**: Both can edit the same document
- **Version history**: Undo/redo with full version tracking
- **Mode system**: Document tools only loaded when needed
- **Conflict resolution**: Graceful handling of simultaneous edits

## Architecture

**NOTE:** Canvas uses fixed 360px width (matching TaskDetailPanel pattern), not percentage.

```
┌──────────────────────────────────────────────────────────────────┐
│                          Chat Page                                │
├──────────────────────────────────────┬───────────────────────────┤
│                                      │                           │
│         Chat Messages                │    Canvas Editor          │
│         (flex-1)                     │    (360px fixed)          │
│                                      │                           │
│  ┌────────────────────────────────┐  │  ┌─────────────────────┐  │
│  │ User: Write a Python script...│  │  │ CSV Processor       │  │
│  └────────────────────────────────┘  │  │ python              │  │
│  ┌────────────────────────────────┐  │  ├─────────────────────┤  │
│  │ Assistant: I've created a     │  │  │ 1 │ import csv      │  │
│  │ script... [createDocument]    │  │  │ 2 │ import sys      │  │
│  └────────────────────────────────┘  │  │ 3 │                 │  │
│                                      │  │ 4 │ def process():  │  │
│  ┌────────────────────────────────┐  │  └─────────────────────┘  │
│  │ Chat Input                    │  │  [Undo] [Redo] [Copy] [↓] │
│  └────────────────────────────────┘  │                           │
└──────────────────────────────────────┴───────────────────────────┘
```

## Implementation Phases

| Phase | Name | Description | Dependencies | Status |
|-------|------|-------------|--------------|--------|
| 1 | [Foundation](./phase-1-foundation.md) | Schema, context, split layout | None | ✅ Done |
| 2 | [Monaco Editor](./phase-2-monaco-editor.md) | Editor integration | Phase 1 | ✅ Done |
| 3 | [Document Tools](./phase-3-document-tools.md) | LLM tools for CRUD | Phase 1, 2 | ✅ Done |
| 4 | [Diff System](./phase-4-diff-system.md) | Diff grabber + applier | Phase 1-3 | |
| 5 | [Mode System](./phase-5-mode-system.md) | Dynamic tool injection | Phase 1-4 | |
| 6 | [Polish](./phase-6-polish-conflict-resolution.md) | Conflicts, undo/redo, UX | Phase 1-5 | |

Each phase document is **self-contained** with:
- Full context and motivation
- Prerequisites and what comes after
- Implementation details with code
- Testing checklist
- File structure changes

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Editor | Monaco Editor | VS Code's editor component |
| Diff Library | `diff` npm package | Compute and apply text diffs |
| State | Convex + React Context | Persistent + reactive state |
| UI | shadcn/ui + Framer Motion | Components + animations |
| Tools | Vercel AI SDK | LLM tool definitions |

## Core Concepts

### 1. Diff Operations

Instead of full document replacement, LLM sends operations:

```typescript
// Replace lines 10-12
{ type: "replace", startLine: 10, endLine: 12, content: "new code" }

// Insert after line 5
{ type: "insert", afterLine: 5, content: "new lines" }

// Delete lines 20-22
{ type: "delete", startLine: 20, endLine: 22 }
```

### 2. Mode System

Document tools are only available when needed:

```
Normal Mode:
├── Base system prompt
├── Core tools (memory, search, etc.)
└── enterDocumentMode tool

Document Mode:
├── Base prompt + document context
├── Core tools + document tools
├── createDocument, updateDocument, readDocument
└── exitDocumentMode tool
```

### 3. Version History

Every change creates a history entry:

```typescript
canvasHistory: {  // NOT canvasDocumentHistory
  documentId,
  content,      // Full snapshot
  version,      // Incrementing number
  source,       // "user_edit" | "llm_diff" | "created"
  diff,         // JSON of operations
  createdAt,
}
```

### 4. Conflict Resolution

When diffs can't cleanly apply:

1. **Detect**: Line numbers out of bounds, content drift
2. **LLM decides**: Retry with fresh read, force replace, or ask user
3. **User fallback**: Choose version via dialog

## Database Schema

```typescript
// Main document table
canvasDocuments: {
  userId,
  conversationId,
  title,
  content,
  language,        // "typescript", "python", etc.
  documentType,    // "code" | "prose"
  version,
  status,          // "active" | "archived"
  createdAt,
  updatedAt,
}

// Version history
canvasHistory: {
  documentId,
  userId,
  content,
  version,
  source,          // "user_edit" | "llm_diff" | "created"
  diff,            // JSON string
  createdAt,
}

// Conversation mode
conversations: {
  // ... existing fields
  mode,            // "normal" | "document"
  modeActivatedAt,
  modeContext,     // JSON with intent, documentType
}
```

## LLM Tools

| Tool | Mode | Purpose |
|------|------|---------|
| `enterDocumentMode` | Normal | Activate document editing |
| `createDocument` | Document | Create new document |
| `updateDocument` | Document | Apply diff operations |
| `readDocument` | Document | Get current content |
| `exitDocumentMode` | Document | Return to normal chat |
| `resolveConflict` | Document | Handle diff conflicts |

## User Flows

### Creating a Document

```
User: "Write me a React component for a todo list"
  ↓
LLM: [calls enterDocumentMode]
  ↓
Canvas opens, mode switches to "document"
  ↓
LLM: [calls createDocument with initial code]
  ↓
Document appears in editor
  ↓
LLM: "I've created a TodoList component..."
```

### Editing with Diffs

```
User: "Add a delete button to each item"
  ↓
LLM: [calls updateDocument with diff operations]
  - insert: onClick handler after line 15
  - replace: line 20 with button element
  ↓
Editor updates with targeted changes
  ↓
LLM: "I've added delete functionality..."
```

### User Manual Edit

```
User types in editor: changes "items" to "tasks"
  ↓
Diff tracker detects change
  ↓
User sends message: "Now add timestamps"
  ↓
Context includes: "[User made manual edits]"
  ↓
LLM: [reads document if needed, then applies diffs]
```

## File Structure After Implementation

```
convex/
├── canvas/
│   ├── documents.ts      # Document CRUD
│   └── history.ts        # Version history queries
├── ai/
│   └── tools/
│       ├── createDocument.ts
│       ├── updateDocument.ts
│       ├── readDocument.ts
│       ├── documentMode.ts
│       └── resolveConflict.ts
├── conversations.ts      # Updated with mode fields
└── schema.ts             # Updated with canvasDocuments, canvasHistory

src/
├── lib/
│   ├── canvas/
│   │   ├── diff.ts           # Diff algorithms
│   │   └── monacoEdits.ts    # Monaco integration
│   └── prompts/
│       └── modePrompts.ts    # Mode-specific prompts
├── hooks/
│   ├── useCanvasMode.ts
│   ├── useCanvasHistory.ts
│   ├── useCanvasDiffTracker.ts
│   └── useCanvasKeyboardShortcuts.ts
├── contexts/
│   └── CanvasContext.tsx     # Simple useState wrapper
└── components/
    ├── chat/
    │   ├── ToolCallDisplay.tsx           # Add icons/labels
    │   └── toolRenderers/
    │       ├── CreateDocumentRenderer.tsx
    │       ├── UpdateDocumentRenderer.tsx
    │       ├── ReadDocumentRenderer.tsx
    │       ├── EnterDocumentModeRenderer.tsx
    │       ├── ExitDocumentModeRenderer.tsx
    │       └── index.ts                  # Add new renderers
    └── canvas/
        ├── CanvasPanel.tsx               # 360px fixed width panel
        ├── CanvasEditor.tsx
        ├── CanvasToolbar.tsx
        ├── ModeIndicator.tsx
        ├── ConflictDialog.tsx
        ├── VersionHistoryPanel.tsx
        ├── CanvasLoadingStates.tsx
        └── CanvasErrorBoundary.tsx
```

## Dependencies Added

```json
{
  "@monaco-editor/react": "^4.6.0",
  "monaco-editor": "^0.55.1",
  "diff": "^8.0.2"
}
```

## Integration Checklist

**CRITICAL:** Before implementing, verify these patterns match the codebase:

### Existing Assets to Reuse
- [ ] `src/hooks/useDebounce.ts` - DO NOT create new debounce hook
- [ ] `src/components/chat/toolRenderers/types.ts` - Use existing `ToolRendererProps` interface
- [ ] `src/components/chat/ToolCallDisplay.tsx` - Add icons to existing `getToolIcon`/`getToolLabel`
- [ ] `src/contexts/ConversationContext.tsx` - Model for simple context pattern

### Patterns to Follow
- [ ] **Fixed width panel**: 360px (like `TaskDetailPanel.tsx`), NOT percentage
- [ ] **Simple context**: Just useState wrapper, no complex logic
- [ ] **Tool registration**: Add to existing `toolRenderers` object in `index.ts`
- [ ] **Schema indexes**: Use `by_field` naming convention
- [ ] **Auth pattern**: `getCurrentUser` for queries, `getCurrentUserOrCreate` for mutations
- [ ] **Import path**: `import { getCurrentUser } from "../lib/userSync"`
- [ ] **TypeScript workaround**: Use `@ts-ignore` pattern for internal Convex calls

### Patterns to Avoid
- [ ] ❌ Creating new debounce hooks
- [ ] ❌ Custom ToolRendererProps interfaces
- [ ] ❌ Percentage-based widths for panels
- [ ] ❌ Complex context with methods (keep to simple state)
- [ ] ❌ Separate icon/label files (add to existing functions)

## Quick Start for Development

1. **Phase 1**: Start with schema and basic layout
   ```bash
   bunx convex dev  # Deploy schema changes
   ```

2. **Phase 2**: Add Monaco
   ```bash
   bun add @monaco-editor/react monaco-editor diff
   ```

3. **Phase 3-4**: Implement tools and diff system

4. **Phase 5**: Add mode switching

5. **Phase 6**: Polish and test

## Testing Strategy

Each phase has a testing checklist. Key tests:

- [ ] Document persists across page refresh
- [ ] Diff operations apply correctly
- [ ] User edits tracked and reported to LLM
- [ ] Mode switches update UI and tools
- [ ] Conflicts detected and resolved
- [ ] Undo/redo works across versions

## References

- [ChatGPT Canvas](https://openai.com/index/introducing-canvas/) - OpenAI's implementation
- [Claude Artifacts](https://support.claude.com/en/articles/9487310) - Anthropic's approach
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Editor docs
- [diff npm package](https://www.npmjs.com/package/diff) - Diff library
- [Vercel AI SDK Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling) - Tool definitions
