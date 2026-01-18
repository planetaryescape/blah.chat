# Refactor: Message Loading Transition

**Context:**
The transition from the "Thinking..." or "Bouncing Dots" loading state to the actual message content.

**The Issue:**
The switch can feel abrupt. As soon as the first token arrives, the loading indicator vanishes and is replaced by text.

**Target File:**
`apps/web/src/components/chat/ChatMessage.tsx`

**Proposed Solution:**
Ensure a smooth visual handoff.

**Implementation Details:**
- Keep the "cursor" (blinking caret) visible at the end of the streaming text.
- Verify `MarkdownContent.tsx` has the `.streaming` class applied correctly which handles the cursor visibility.
- Ensure no layout shift occurs when the `MessageLoadingState` component is unmounted and `InlineToolCallContent` takes its place.
