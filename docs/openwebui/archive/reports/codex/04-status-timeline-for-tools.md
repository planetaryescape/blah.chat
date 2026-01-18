# Work Item 04: Status Timeline for Tool-Heavy Responses

## Summary
Provide a compact status timeline for tool-driven actions (web search, code execution, file parsing). This appears before text exists and gives feedback that the assistant is working.

## Problem
- When `partialContent` is empty and `status` is generating, the UI only shows dots or "Thinking".
- Users cannot tell whether the model is searching or stalled.

## User Impact
- Perceived slowness, uncertainty about progress.

## Proposed Fix
- Add a `StatusTimeline` component rendered inside assistant bubbles when tool progress exists.
- Map tool calls and generation phases into human-readable steps.

## Implementation Notes
- File: `apps/web/src/components/chat/ChatMessage.tsx`
- Potential data sources: tool calls in metadata cache (`useCachedToolCalls`), sources table updates, or explicit status fields in messages.
- Use a small vertical step list similar to Open WebUI's `StatusHistory`.

## Acceptance Criteria
- When a tool call begins and no text is yet visible, the status list is shown.
- When content starts streaming, the status list remains visible but less prominent.
- Status entries update or mark complete as tool calls finish.

## Tests
- Trigger web search tool and verify status appears immediately.
- Trigger code execution and verify steps appear.
- Ensure no status UI appears for regular text-only messages.
