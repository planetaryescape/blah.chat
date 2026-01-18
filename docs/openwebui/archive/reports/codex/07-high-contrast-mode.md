# Work Item 07: High Contrast Mode

## Summary
Add a high-contrast UI mode that increases contrast and stroke weights for readability.

## Problem
- The current theme is optimized for aesthetics, but does not provide a high-contrast alternative.

## User Impact
- Reduced readability for low-vision users or poor display conditions.

## Proposed Fix
- Add a user preference `highContrastMode`.
- Adjust colors and icon strokes in chat UI and critical controls.

## Implementation Notes
- Add preference in Convex user settings.
- Update theme tokens or conditional className usage to increase contrast.
- Reference Open WebUI usage of `highContrastMode` in `/tmp/open-webui/src/lib/components/chat/Settings/Interface.svelte`.

## Acceptance Criteria
- Toggle updates contrast across message bubbles, buttons, and icons.
- Mode persists across sessions.

## Tests
- Toggle on/off and verify readable contrast in chat view and input.
