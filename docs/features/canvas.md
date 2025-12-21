# Canvas Feature Architecture

This document consolidates the design decisions, architecture, and implementation details for the Canvas feature - a split-screen document editor for collaborative writing and coding with the LLM.

## Overview

Canvas is a persistent document editor that opens alongside chat when users work on writing or coding tasks. Similar to ChatGPT Canvas and Claude Artifacts, it keeps chat lean while enabling LLM-assisted document editing via diffs rather than full rewrites.

### Why Canvas Exists

| Without Canvas | With Canvas |
|---------------|-------------|
| LLM rewrites full document in each message | LLM sends targeted diffs |
| Long documents clutter chat | Documents live in dedicated editor |
| User edits require copy-paste | User edits directly in editor |
| No version history | Full undo/redo support |
| Context wasted on repeated content | Context used efficiently |

### Key Benefits

- **Context efficiency**: Sending full documents wastes tokens
- **Edit precision**: Diffs show exactly what changed (like git)
- **User control**: Direct editing + LLM assistance in one workspace
- **Better UX**: Long documents don't clutter the chat interface

---

## Architecture

### Layout

Canvas uses a **fixed 360px width** panel (following `TaskDetailPanel` pattern), not percentage-based:

```
┌──────────────────────────────────────────────────────────────────┐
│                          Chat Page                                │
├──────────────────────────────────┬───────────────────────────────┤
│         Chat Messages            │    Canvas Editor              │
│         (flex-1)                 │    (360px fixed)              │
│  ┌────────────────────────────┐  │  ┌─────────────────────────┐  │
│  │ User: Write a script...   │  │  │ CSV Processor           │  │
│  └────────────────────────────┘  │  │ python                  │  │
│  ┌────────────────────────────┐  │  ├─────────────────────────┤  │
│  │ Assistant: I've created..│  │  │ 1 │ import csv          │  │
│  │ [createDocument]          │  │  │ 2 │ def process():      │  │
│  └────────────────────────────┘  │  └─────────────────────────┘  │
│  ┌────────────────────────────┐  │  [Undo] [Redo] [Copy] [↓]     │
│  │ Chat Input                │  │                               │
│  └────────────────────────────┘  │                               │
└──────────────────────────────────┴───────────────────────────────┘
```

### Core Concepts

#### 1. Diff Operations

Instead of full document replacement, LLM sends targeted operations:

```typescript
// Replace lines 10-12
{ type: "replace", startLine: 10, endLine: 12, content: "new code" }

// Insert after line 5
{ type: "insert", afterLine: 5, content: "new lines" }

// Delete lines 20-22
{ type: "delete", startLine: 20, endLine: 22 }
```

**Why structured diffs over unified diff format:**
- Line numbers explicit (no context matching needed)
- Operations atomic (can apply individually)
- Works well with Monaco's `executeEdits()` API

**Application order:** Operations sort by line number descending (bottom to top) to prevent line number shifting issues.

#### 2. Mode System

Document tools only available when needed:

```
Normal Mode:
├── Base system prompt
├── Core tools (memory, search, etc.)
└── enterDocumentMode tool

Document Mode (LLM activates):
├── Base prompt + document context
├── Core tools + document tools
├── createDocument, updateDocument, readDocument
└── exitDocumentMode tool
```

**Why modes?**
- Wasted context: Document tools consume ~500 tokens even when unused
- Confusion prevention: LLM might use `createDocument` for simple code snippets
- Cleaner prompts: Tool descriptions don't clutter the system prompt

**Key insight:** LLM detects intent, system handles mode switch. This keeps architecture clean and LLM in control.

#### 3. Version History

Every change creates a history entry (snapshots, not incremental diffs):

```typescript
canvasHistory: {
  documentId,
  content,      // Full snapshot
  version,      // Incrementing number
  source,       // "user_edit" | "llm_diff" | "created"
  diff,         // JSON of operations (for display)
  createdAt,
}
```

**Design decision:** Version undo creates new versions (not navigating history). Simpler mental model, avoids branching complexity.

#### 4. Conflict Resolution

When diffs can't cleanly apply:

1. **Detect**: Line numbers out of bounds, content drift
2. **LLM decides**: Retry with fresh read, force replace, or ask user
3. **User fallback**: Choose version via dialog (Keep Mine / Use AI's / Merge Both)

**Merge strategy (user-selected):** "Merge Both" appends AI content below user content with `---` separator. Simple, predictable.

---

## Database Schema

```typescript
// Main document table
canvasDocuments: {
  userId: Id<"users">,
  conversationId: Id<"conversations">,
  title: string,
  content: string,
  language?: string,       // "typescript", "python", etc.
  documentType: "code" | "prose",
  version: number,
  status: "active" | "archived",
  createdAt: number,
  updatedAt: number,
}
// Indexes: by_user, by_conversation, by_user_conversation

// Version history
canvasHistory: {
  documentId: Id<"canvasDocuments">,
  userId: Id<"users">,
  content: string,
  version: number,
  source: "user_edit" | "llm_diff" | "created",
  diff?: string,           // JSON string
  createdAt: number,
}
// Indexes: by_document, by_document_version

// Conversation mode (added to existing table)
conversations: {
  // ... existing fields
  mode?: "normal" | "document",
  modeActivatedAt?: number,
  modeContext?: string,    // JSON with intent, documentType
}
```

**One active document per conversation:** Creating new document archives old one. Keeps things simple.

---

## LLM Tools

| Tool | Mode | Purpose |
|------|------|---------|
| `enterDocumentMode` | Normal | Activate document editing |
| `createDocument` | Document | Create new document |
| `updateDocument` | Document | Apply diff operations |
| `readDocument` | Document | Get current content |
| `exitDocumentMode` | Document | Return to normal chat |
| `resolveConflict` | Document | Handle diff conflicts |

### When LLM Should Use Document Mode

**Use for:**
- Content > 20 lines or needs iteration/refinement
- "Write me a...", "create a...", "draft a..."
- Scripts, components, articles, essays

**Stay in normal mode for:**
- Quick answers, short code snippets
- Questions about existing code
- General discussion

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Editor | Monaco Editor | VS Code's editor component |
| Diff Library | `diff` npm package | Compute and apply text diffs |
| State | Convex + React Context | Persistent + reactive state |
| UI | shadcn/ui + Framer Motion | Components + animations |
| Tools | Vercel AI SDK | LLM tool definitions |

### Monaco Editor Choice

Why Monaco over CodeMirror or Tiptap:
- **Line numbers**: Native support (critical for diff positioning)
- **Programmatic edits**: `executeEdits()` API for applying diffs
- **Diff visualization**: Built-in
- **Syntax highlighting**: 50+ languages

Trade-off: ~2MB bundle (lazy loaded).

---

## Key Design Decisions

### 1. Simple Context Pattern

`CanvasContext` is a minimal useState wrapper, not a complex state machine:

```typescript
interface CanvasContextType {
  documentId: Id<"canvasDocuments"> | null;
  setDocumentId: (id) => void;
  pendingConflict: ConflictInfo | null;
  setPendingConflict: (conflict) => void;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (show) => void;
}
```

Queries and mutations called directly in components using `useQuery`/`useMutation`, not wrapped in context.

### 2. Toolbar-Only Version Undo

- Monaco handles Cmd+Z for text undo (built-in, character-level)
- Version undo/redo via toolbar buttons only
- Avoids conflict between text and version undo
- Simpler mental model for users

### 3. Version Snapshots (Not Incremental)

History stores full content snapshots rather than incremental diffs:
- Simpler to implement and reason about
- Any version can be restored directly
- Trade-off: More storage, but documents rarely huge

### 4. LLM-Driven Mode Detection

System doesn't auto-detect document intent. LLM explicitly calls `enterDocumentMode`.
- More reliable than heuristics
- LLM can explain why it's switching modes
- Graceful fallback if LLM forgets (document tools still work)

---

## File Structure

```
convex/
├── canvas/
│   ├── documents.ts         # Document CRUD, applyDiff mutation
│   └── history.ts           # Version history queries
├── ai/
│   └── tools/
│       ├── createDocument.ts
│       ├── updateDocument.ts
│       ├── readDocument.ts
│       ├── documentMode.ts      # enter/exit mode tools
│       └── resolveConflict.ts
├── conversations.ts         # setMode, getMode mutations
└── schema.ts                # canvasDocuments, canvasHistory

src/
├── lib/
│   ├── canvas/
│   │   ├── diff.ts              # Diff algorithms, conflict detection
│   │   └── monacoEdits.ts       # Monaco integration
│   └── prompts/
│       └── modePrompts.ts       # Mode-specific prompts
├── hooks/
│   ├── useCanvasMode.ts         # Mode state, auto-open/close
│   ├── useCanvasHistory.ts      # Undo/redo, version management
│   └── useCanvasDiffTracker.ts  # Track user edits
├── contexts/
│   └── CanvasContext.tsx        # Simple useState wrapper
└── components/
    ├── chat/
    │   ├── ToolCallDisplay.tsx  # Icons/labels for canvas tools
    │   └── toolRenderers/
    │       ├── CreateDocumentRenderer.tsx
    │       ├── UpdateDocumentRenderer.tsx
    │       ├── ReadDocumentRenderer.tsx
    │       ├── EnterDocumentModeRenderer.tsx
    │       ├── ExitDocumentModeRenderer.tsx
    │       └── ResolveConflictRenderer.tsx
    └── canvas/
        ├── CanvasPanel.tsx          # 360px fixed width panel
        ├── CanvasEditor.tsx         # Monaco wrapper
        ├── CanvasToolbar.tsx        # Undo/redo, copy, download
        ├── ModeIndicator.tsx        # Shows current mode
        ├── ConflictDialog.tsx       # User conflict resolution
        ├── VersionHistoryPanel.tsx  # Version list
        ├── CanvasLoadingStates.tsx  # Loading/save indicators
        └── CanvasErrorBoundary.tsx  # Error recovery
```

---

## Dependencies

```json
{
  "@monaco-editor/react": "^4.6.0",
  "monaco-editor": "^0.55.1",
  "diff": "^8.0.2"
}
```

---

## Patterns to Follow

When enhancing Canvas:

1. **Fixed width panel**: 360px, not percentage
2. **Simple context**: Just useState wrapper, no complex logic
3. **Tool registration**: Add to existing `toolRenderers` object
4. **Schema indexes**: Use `by_field` naming convention
5. **Auth pattern**: `getCurrentUser` for queries, `getCurrentUserOrCreate` for mutations
6. **TypeScript workaround**: Use `@ts-ignore` for internal Convex calls (type depth issue)

### Patterns to Avoid

- Creating new debounce hooks (use existing `src/hooks/useDebounce.ts`)
- Custom ToolRendererProps interfaces (use existing from types.ts)
- Percentage-based widths for panels
- Complex context with methods
- Separate icon/label files (add to existing functions)

---

## Error Handling

| Error | Detection | Recovery |
|-------|-----------|----------|
| Network failure during save | Mutation throws | Retry with exponential backoff |
| Invalid diff from LLM | Validation fails | Return error, ask LLM to retry |
| Monaco crashes | Error boundary | Show error, offer reload |
| Version conflict | Version mismatch | Fetch latest, reapply |
| Document deleted externally | Query returns null | Show "document deleted" message |
| Line numbers out of bounds | Diff validation | LLM reads current, sends new diff |

---

## Performance Notes

1. **History limit**: Only load last 50 versions
2. **Debounced saves**: 500ms debounce prevents excessive writes
3. **Lazy load history**: Only fetch when panel opens
4. **Monaco lazy loading**: ~2MB loaded on first render
5. **Operation ordering**: Bottom-to-top prevents line shifting

---

## Future Enhancements (Not Implemented)

1. **Real-time collaboration**: Multiple users editing same document
2. **Branching**: Git-style branches for experiments
3. **Diff visualization**: Side-by-side diff view in editor
4. **Export formats**: PDF, DOCX for prose documents
5. **Templates**: Pre-built document templates
6. **Auto-detection**: ML classifier for mode detection (currently LLM-driven)

---

## Maintenance Notes

### Adding New Document Tools

1. Create tool in `convex/ai/tools/`
2. Create renderer in `src/components/chat/toolRenderers/`
3. Add to `toolRenderers` object in `index.ts`
4. Add icon/label in `ToolCallDisplay.tsx`
5. Register in `convex/generation.ts` (mode-aware)

### Modifying Diff System

The diff system (`src/lib/canvas/diff.ts`) is the core of Canvas efficiency:
- `computeDiff()`: Used for tracking user edits
- `applyDiffOperations()`: Used for LLM changes
- `validateDiffOperations()`: Prevents invalid diffs

Always test with edge cases: empty documents, single line, very long documents.

### Debugging Mode Issues

If mode doesn't switch properly:
1. Check `conversations.mode` in database
2. Verify `useCanvasMode` hook is called in chat page
3. Check `getMode` query returns expected value
4. Look for LLM calling wrong tool in generation logs

---

## References

- [ChatGPT Canvas](https://openai.com/index/introducing-canvas/) - OpenAI's implementation
- [Claude Artifacts](https://support.claude.com/en/articles/9487310) - Anthropic's approach
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Editor docs
- [diff npm package](https://www.npmjs.com/package/diff) - Diff library
- [Vercel AI SDK Tools](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling) - Tool definitions
