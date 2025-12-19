# Phase 2: Monaco Editor Integration

## Overview

This phase integrates Monaco Editor (the VS Code editor) into the Canvas feature. Monaco provides a powerful editing experience for both code and prose, with features like syntax highlighting, line numbers, and programmatic text manipulation—essential for applying LLM-generated diffs.

## Context

### What is Monaco Editor?

Monaco is the code editor that powers VS Code. Key features:

- **Syntax highlighting** for 50+ languages
- **Line numbers** (critical for precise diff positioning)
- **IntelliSense** (autocomplete, though we may disable for prose)
- **Programmatic API** for applying edits (`editor.executeEdits()`)
- **Diff editor mode** for visualizing changes
- **Minimap** for navigation in large documents

### Why Monaco over alternatives?

| Feature | Monaco | CodeMirror | Tiptap |
|---------|--------|------------|--------|
| Line numbers | ✅ Native | ✅ Plugin | ❌ Not designed for |
| Syntax highlighting | ✅ 50+ langs | ✅ Many | ⚠️ Limited |
| Programmatic edits | ✅ `executeEdits()` | ✅ `dispatch()` | ⚠️ Different paradigm |
| Diff visualization | ✅ Built-in | ⚠️ Plugins | ❌ No |
| Prose editing | ⚠️ Works but technical | ⚠️ Same | ✅ Designed for |
| Bundle size | ~2MB | ~300KB | ~200KB |

**Decision**: Monaco. The diff application via line/column coordinates is critical. Users will see a code-editor-style interface even for prose (line numbers help LLM specify edit locations).

### What does this phase accomplish?

1. Install and configure Monaco for Next.js
2. Create a reusable Monaco wrapper component
3. Support both code and prose editing modes
4. Enable programmatic text access for diff operations
5. Handle editor events (content changes, cursor position)

## Prerequisites

- **Phase 1 complete**: Schema, CanvasContext, CanvasPanel exist
- Canvas documents can be created/updated via Convex

## What Comes After

- **Phase 3**: Document management tools for LLM
- **Phase 4**: Diff system (uses Monaco's edit APIs)
- **Phase 5**: Mode system
- **Phase 6**: Polish

---

## Scope

### In Scope

1. Install `@monaco-editor/react` package
2. Create `CanvasEditor` component wrapping Monaco
3. Configure Monaco for code mode (TypeScript, Python, etc.)
4. Configure Monaco for prose mode (Markdown with soft wrap)
5. Bidirectional sync: Convex document ↔ Monaco content
6. Expose editor instance ref for Phase 4 diff operations
7. Basic toolbar (language selector, save indicator)

### Out of Scope

- Diff application logic (Phase 4)
- LLM tools (Phase 3)
- Mode switching (Phase 5)
- Undo/redo UI (Phase 6)

---

## Implementation

### 1. Install Dependencies

```bash
bun add @monaco-editor/react monaco-editor
```

**Note**: `@monaco-editor/react` is the official React wrapper. It handles:
- Lazy loading (Monaco is ~2MB)
- Web Worker setup
- TypeScript type definitions

### 2. Next.js Configuration

Monaco requires web workers. Update `next.config.ts`:

```typescript
// next.config.ts
const nextConfig = {
  // ... existing config
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Monaco editor web workers
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};
```

### 3. Monaco Editor Component

Create `src/components/canvas/CanvasEditor.tsx`:

```typescript
"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce"; // Existing hook - do NOT create new

interface CanvasEditorProps {
  document: Doc<"canvasDocuments">;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
}

// Language mapping for common file types
const LANGUAGE_MAP: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  python: "python",
  rust: "rust",
  go: "go",
  java: "java",
  csharp: "csharp",
  cpp: "cpp",
  c: "c",
  html: "html",
  css: "css",
  json: "json",
  yaml: "yaml",
  markdown: "markdown",
  sql: "sql",
  shell: "shell",
  // Prose uses markdown for soft wrap and basic formatting
  prose: "markdown",
};

export function CanvasEditor({ document, onEditorReady }: CanvasEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const updateContent = useMutation(api.canvas.documents.updateContent);

  // Local content state for immediate UI updates
  const [localContent, setLocalContent] = useState(document.content);
  const debouncedContent = useDebounce(localContent, 500);

  // Sync document content to local state when document changes externally
  useEffect(() => {
    if (document.content !== localContent) {
      setLocalContent(document.content);
      // Also update Monaco if it's out of sync (e.g., LLM applied a diff)
      if (editorRef.current) {
        const currentValue = editorRef.current.getValue();
        if (currentValue !== document.content) {
          editorRef.current.setValue(document.content);
        }
      }
    }
  }, [document.content]);

  // Persist changes to Convex (debounced)
  useEffect(() => {
    if (debouncedContent !== document.content && debouncedContent !== "") {
      updateContent({
        documentId: document._id,
        content: debouncedContent,
        source: "user_edit",
      }).catch(console.error);
    }
  }, [debouncedContent, document._id, document.content, updateContent]);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure editor based on document type
      if (document?.documentType === "prose") {
        configureForProse(editor, monaco);
      } else {
        configureForCode(editor, monaco);
      }

      // Notify parent component
      onEditorReady?.(editor);
    },
    [document?.documentType, onEditorReady]
  );

  const handleContentChange = useCallback((value: string | undefined) => {
    setLocalContent(value ?? "");
  }, []);

  const language = document.language
    ? LANGUAGE_MAP[document.language] ?? document.language
    : document.documentType === "prose"
      ? "markdown"
      : "typescript";

  return (
    <div className="h-full flex flex-col">
      <EditorToolbar
        language={language}
        documentType={document.documentType}
        isSaving={localContent !== document.content}
      />
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={localContent}
          onChange={handleContentChange}
          onMount={handleEditorMount}
          theme="vs-dark" // Or create custom theme matching app design
          options={{
            // Core settings
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            minimap: { enabled: document.documentType === "code" },
            scrollBeyondLastLine: false,

            // For prose mode, enable word wrap
            wordWrap: document.documentType === "prose" ? "on" : "off",

            // Accessibility
            accessibilitySupport: "auto",

            // Performance
            renderWhitespace: "selection",
            smoothScrolling: true,

            // UX
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            automaticLayout: true,

            // Disable features that aren't useful for our use case
            codeLens: false,
            inlayHints: { enabled: "off" },
          }}
          loading={
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse">Loading Monaco...</div>
            </div>
          }
        />
      </div>
    </div>
  );
}

// Configure editor for prose/essay writing
function configureForProse(
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco
) {
  // Disable code-specific features
  editor.updateOptions({
    lineNumbers: "on", // Keep for LLM diff references
    folding: false,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    renderLineHighlight: "line",
    wordWrap: "on",
    wrappingStrategy: "advanced",
    minimap: { enabled: false },
    // Larger font for reading
    fontSize: 15,
    lineHeight: 24,
  });
}

// Configure editor for code editing
function configureForCode(
  editor: editor.IStandaloneCodeEditor,
  monaco: Monaco
) {
  editor.updateOptions({
    lineNumbers: "on",
    folding: true,
    glyphMargin: true,
    minimap: { enabled: true },
    bracketPairColorization: { enabled: true },
    guides: {
      indentation: true,
      bracketPairs: true,
    },
  });
}

// Toolbar component
interface EditorToolbarProps {
  language: string;
  documentType: "code" | "prose";
  isSaving: boolean;
}

function EditorToolbar({ language, documentType, isSaving }: EditorToolbarProps) {
  return (
    <div className="h-8 px-3 flex items-center justify-between border-b border-border bg-muted/30 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {documentType === "code" ? language : "Document"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isSaving ? (
          <span className="text-muted-foreground animate-pulse">Saving...</span>
        ) : (
          <span className="text-green-500">Saved</span>
        )}
      </div>
    </div>
  );
}
```

### 4. Update CanvasPanel

Replace the placeholder with the real editor in `src/components/canvas/CanvasPanel.tsx`:

```typescript
// In src/components/canvas/CanvasPanel.tsx

import { CanvasEditor } from "./CanvasEditor";
import { useRef } from "react";
import type { editor } from "monaco-editor";

export function CanvasPanel() {
  const { isOpen, setIsOpen, documentId } = useCanvas();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const document = useQuery(
    api.canvas.documents.get,
    documentId ? { documentId } : "skip"
  );

  if (!isOpen) return null;

  return (
    <div className="w-[400px] border-l border-border flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        {/* ... header content ... */}
      </div>

      {/* Editor - replaces placeholder from Phase 1 */}
      <div className="flex-1 overflow-hidden">
        {document ? (
          <CanvasEditor
            document={document}
            onEditorReady={(editor) => {
              editorRef.current = editor;
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No document open
          </div>
        )}
      </div>
    </div>
  );
}
```

**Note:** Editor ref is stored locally in `CanvasPanel`, not in context. This keeps the context simple (following existing patterns). If Phase 4 needs access to the editor from tools, we can pass it via props or create a dedicated hook.

### 5. Custom Theme (Optional)

Create a theme matching the app's design:

```typescript
// src/components/canvas/monacoTheme.ts

import type { editor } from "monaco-editor";

export const blahChatDarkTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6A737D", fontStyle: "italic" },
    { token: "keyword", foreground: "F97583" },
    { token: "string", foreground: "9ECBFF" },
    { token: "number", foreground: "79B8FF" },
    { token: "type", foreground: "B392F0" },
    { token: "function", foreground: "B392F0" },
    { token: "variable", foreground: "E1E4E8" },
  ],
  colors: {
    "editor.background": "#0D1117",
    "editor.foreground": "#E1E4E8",
    "editor.lineHighlightBackground": "#161B22",
    "editor.selectionBackground": "#3392FF44",
    "editorCursor.foreground": "#79B8FF",
    "editorLineNumber.foreground": "#6E7681",
    "editorLineNumber.activeForeground": "#E1E4E8",
    "editor.inactiveSelectionBackground": "#3392FF22",
  },
};

// Register in CanvasEditor.tsx onMount:
monaco.editor.defineTheme("blah-chat-dark", blahChatDarkTheme);
editor.updateOptions({ theme: "blah-chat-dark" });
```

---

## File Structure

After this phase:

```
src/
├── components/
│   └── canvas/
│       ├── CanvasPanel.tsx     # Updated with CanvasEditor
│       ├── CanvasEditor.tsx    # NEW - Monaco wrapper
│       └── monacoTheme.ts      # NEW (optional)
├── hooks/
│   └── useDebounce.ts          # EXISTING - already in codebase
```

**Note:** CanvasContext is NOT modified in this phase - we keep it simple.

---

## Testing Checklist

- [ ] Monaco loads without errors (check console for worker issues)
- [ ] Editor displays document content on load
- [ ] Typing updates local state immediately
- [ ] Changes persist to Convex after 500ms debounce
- [ ] External document changes (LLM diff) update editor content
- [ ] Code mode: syntax highlighting works for TypeScript, Python
- [ ] Prose mode: word wrap enabled, no minimap
- [ ] Line numbers visible in both modes
- [ ] Save indicator shows "Saving..." during debounce, "Saved" after
- [ ] No memory leaks on unmount (check with React DevTools)

---

## Dependencies Added

```json
{
  "@monaco-editor/react": "^4.6.0",
  "monaco-editor": "^0.55.1"
}
```

---

## Performance Notes

1. **Lazy loading**: Monaco is ~2MB. `@monaco-editor/react` loads it lazily on first render.
2. **Web workers**: Monaco uses workers for syntax highlighting. Ensure Next.js webpack config is correct.
3. **Debounced saves**: 500ms debounce prevents excessive Convex writes.
4. **External updates**: When LLM applies diff, we update Monaco via `setValue()` only if content differs (avoids cursor jump).

---

## Known Issues & Mitigations

| Issue | Mitigation |
|-------|------------|
| Monaco SSR crash | Component is `"use client"`, never renders on server |
| Cursor jumps on external update | Check if content actually changed before `setValue()` |
| Large documents slow | Monaco handles well; if needed, enable virtual rendering |
| Theme flash on load | Pre-define theme before first render |

---

## References

- Monaco Editor docs: https://microsoft.github.io/monaco-editor/
- @monaco-editor/react: https://github.com/suren-atoyan/monaco-react
- VS Code themes: https://code.visualstudio.com/docs/getstarted/themes
