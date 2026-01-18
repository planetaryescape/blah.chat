# Work Item 10: IME and Safari Composition Guard

## Summary
Prevent unintended newline insertion or double-submit on Safari/iOS when using IME composition.

## Problem
- Safari iOS can emit `compositionend` and `keydown` for Enter, causing unintended behavior.
- Current input handling in blah.chat does not guard this.

## User Impact
- Users may accidentally submit early or insert unwanted newlines.

## Proposed Fix
- Track composition state and ignore Enter key immediately after `compositionend` on Safari.
- Implement the same guard used in Open WebUI.

## Implementation Notes
- File: `apps/web/src/hooks/useChatInputKeyboard.ts`.
- Track `isComposing` and `compositionEndedAt` timestamps.
- Ignore Enter key when `timeStamp` is within a small threshold of composition end.
- Reference Open WebUI: `/tmp/open-webui/src/lib/components/chat/MessageInput.svelte`.

## Acceptance Criteria
- IME input does not insert unwanted newline on Safari.
- Enter still submits when not composing.

## Tests
- Manual test on iOS Safari with Japanese IME: Enter confirms character without submitting.
