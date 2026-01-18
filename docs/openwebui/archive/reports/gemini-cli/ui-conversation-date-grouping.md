# UI: Conversation Date Grouping

**Context:**
The list of conversations in the sidebar.

**The Issue:**
It's a flat list. Finding "that chat from yesterday" requires scanning everything.

**Target File:**
`apps/web/src/components/sidebar/ConversationList.tsx`

**Proposed Solution:**
Group items by time.

**Implementation Details:**
- Sort `conversations` by `updatedAt` (descending).
- Create helper function `groupByDate(conversations)`:
  - Groups: "Today", "Yesterday", "Previous 7 Days", "Older".
- Render sticky headers for each group in the list.
