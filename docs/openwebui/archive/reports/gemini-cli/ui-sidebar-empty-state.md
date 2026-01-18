# UI: Sidebar Empty State (Call to Action)

**Context:**
The sidebar list when a user has no conversations.

**The Issue:**
It displays a plain text "No conversations yet". This is a dead end.

**Target File:**
`apps/web/src/components/sidebar/ConversationList.tsx`

**Proposed Solution:**
Transform this into a useful Call to Action (CTA).

**Implementation Details:**
- Create `EmptyConversationState.tsx`.
- Include:
  - A friendly icon (e.g., `MessageSquarePlus`).
  - Text: "Start your first chat".
  - A button that triggers `handleNewChat`.
- Replace the simple text return with this component.
