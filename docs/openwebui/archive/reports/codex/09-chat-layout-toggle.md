# Work Item 09: Bubble vs Transcript Layout Toggle

## Summary
Add a toggle to switch between bubble-style chat and a flat transcript layout with avatars and usernames.

## Problem
- Current chat layout is fixed to bubble style.
- Some users prefer transcript layout for scanning and collaboration.

## User Impact
- Harder to scan long conversations, especially in team contexts.

## Proposed Fix
- Add a `chatBubble` preference. When off, render a flat list with avatars and names (Open WebUI pattern).

## Implementation Notes
- Add preference in Convex.
- Update `ChatMessage` to conditionally render bubble styles vs transcript styles.
- Reference Open WebUI `chatBubble` behavior in `/tmp/open-webui/src/lib/components/chat/Messages/UserMessage.svelte` and `ResponseMessage.svelte`.

## Acceptance Criteria
- Toggle switches layout without breaking message alignment.
- Transcript layout shows user and assistant names with timestamps.

## Tests
- Toggle on/off and verify consistent spacing and actions.
