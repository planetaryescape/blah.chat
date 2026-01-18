# UI: Code Block FOUC (Flash of Unstyled Content)

**Context:**
Syntax highlighting in code blocks.

**The Issue:**
The `CodeBlock` component defers highlighting to `requestIdleCallback` for performance. This results in a split-second where the code is shown as plain text before snapping to colors.

**Target File:**
`apps/web/src/components/chat/CodeBlock.tsx`

**Proposed Solution:**
Smooth out the transition.

**Implementation Details:**
- Render the "plain text" fallback with a background color that matches the final code block theme (Obsidian/Stardust).
- When `highlightResult` is ready, use a CSS opacity transition to cross-fade from the raw text to the highlighted HTML.
