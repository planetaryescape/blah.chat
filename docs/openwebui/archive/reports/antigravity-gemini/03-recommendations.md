# Recommendations & Implementation Guide for blah.chat

## Context
This document outlines specific, actionable recommendations to improve the `blah.chat` UI/UX, derived from a deep-dive comparison with **Open WebUI**. The goal is to close the "polish gap" while maintaining our superior technical foundation (Virtualization).

## 1. ✨ Add "Blinking Cursor" to Streaming Messages (Immediate Win)

**The Problem**: Currently, streaming text just "appears" in chunks. It feels functional but lacks the "alive" quality of a terminal or human typing.
**The Fix**: Append a blinking block cursor to the *active* streaming message.

### Implementation Details
**Target File**: `apps/web/src/components/chat/ChatMessage.tsx` (and potentially `MarkdownContent.tsx`)

1.  **Define the Animation**:
    Add a standard "pulse" or customized "blink" animation to your global CSS or Tailwind config, or use `animate-pulse`.
    ```css
    /* text-primary is a good color choice */
    .cursor-blink {
      display: inline-block;
      width: 0.6em;
      height: 1.2em;
      background-color: currentColor;
      animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      vertical-align: text-bottom;
      margin-left: 2px;
    }
    ```

2.  **Logic in Component**:
    In `ChatMessage.tsx`, you need to detect if the message is currently generating.
    ```tsx
    // Concept
    const isStreaming = message.status === 'generating' || message.status === 'pending';
    const isLast = index === messages.length - 1; // Passed from parent or calculated

    // Pass 'isStreaming' prop down to your Markdown renderer
    <MarkdownContent content={message.content} showCursor={isStreaming && isLast} />
    ```

3.  **Render the Cursor**:
    In `MarkdownContent.tsx`, append the cursor span to the end of the rendered output.
    *   *Note*: Since markdown parsers can be tricky, you might need to append it as a customized react component or just a trailing `<span>` outside the markdown wrapper if strict markdown correctness isn't required for the cursor itself.

## 2. 🦴 Implement Skeleton Loader (Visual Stability)

**The Problem**: When a user sends a message, there is often a distinct pause (latency) before the first token arrives. The UI might look "stalled" or the "scroll to bottom" might feel premature if the container is empty.
**The Fix**: Render a "Skeleton" message bubble immediately upon sending, occupying the space where the response *will* be.

### Implementation Details
**Target File**: `apps/web/src/components/chat/VirtualizedMessageList.tsx`

1.  **State**:
    You likely have a state tracking `isGenerating` or `awaitingResponse`.
2.  **Render**:
    In your list rendering logic, if `awaitingResponse` is true but no optimistic assistant message exists yet, append a dummy item to your virtualized list data.
    ```tsx
    // VirtualizedMessageList.tsx
    const skeletonMessage = {
      id: 'temp-skeleton',
      role: 'assistant',
      isSkeleton: true,
      // ... other required props
    };

    const finalMessages = isWaitingForResponse
      ? [...messages, skeletonMessage]
      : messages;
    ```
3.  **Component**:
    Create a `MessageSkeleton.tsx` that mimics the exact padding and dimensions of a real message, but with pulsating gray bars (standard Shadcn/UI `Skeleton` component) for lines of text.

## 3. ⌨️ "Command Center" Input (Power User Feature)

**The Problem**: The input box is currently just a text field. Power users expect to control the app without mouse interaction.
**The Fix**: intercept specific keystrokes (`/`) to show a popover menu.

### Implementation Details
**Target File**: `apps/web/src/components/chat/ChatInput.tsx`

1.  **Slash Command Listener**:
    ```tsx
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === '/' && inputValue === '') {
        // Show Command Palette popover
        setShowCommands(true);
      }
    };
    ```
2.  **Command Palette**:
    Use a `Command` component (like `cmdk` or Shadcn's `Command`) anchored to the input box.
    *   **Items to include**:
        *   `/model [name]` - Switch Model
        *   `/clear` - Clear Context
        *   `/template` - Insert specific prompt template

## 4. 🚀 Message Branching (Long Term Architecture)

**The Problem**: Linear chat history prevents "what if" exploration.
**The Fix**: A Graph-based message history.

**Target**: Backend Schema & `VirtualizedMessageList.tsx` logic.
*   **Schema Change**: Messages need `parentId` (ID) and `childrenIds` (Array<ID>).
*   **Frontend Logic**: The "Message List" is no longer just "all messages". It is a *traversal* from the `currentLeafId` back to the root.
    *   *Action*: When user edits a message, create NEW message with same `parentId`.
    *   *UI*: Add `< ChevronLeft | ChevronRight >` navigator on message bubbles that have multiple siblings.

---
*Based on Antigravity Research Report - Jan 2026*
