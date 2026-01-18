# Work Item 08: Chat Direction Toggle (LTR/RTL/Auto)

## Summary
Add a UI preference to control text direction in chat messages and input fields.

## Problem
- No support for RTL/auto direction. Mixed-language messages may render awkwardly.

## User Impact
- RTL users experience incorrect punctuation flow and readability issues.

## Proposed Fix
- Add `chatDirection` setting with values `auto`, `ltr`, `rtl`.
- Apply `dir` attribute to message containers and input.

## Implementation Notes
- Use `dir={chatDirection}` on message wrappers and input area.
- Add setting to UI settings page.
- Reference Open WebUI pattern in `/tmp/open-webui/src/lib/components/chat/Settings/Interface.svelte` and message components.

## Acceptance Criteria
- Direction changes immediately across message list and input.
- `auto` defaults to browser heuristics.

## Tests
- Send Arabic/Hebrew text and verify correct flow when `rtl` is set.
