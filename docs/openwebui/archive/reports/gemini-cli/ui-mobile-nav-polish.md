# UI: Mobile Navigation Polish

**Context:**
Overflow items in the mobile sidebar.

**The Issue:**
Items that don't fit are tucked into a "More" dropdown menu. This is clunky on mobile (small targets, extra taps).

**Target File:**
`apps/web/src/components/sidebar/app-sidebar.tsx`

**Proposed Solution:**
Remove the dropdown and allow natural scrolling.

**Implementation Details:**
- Remove the logic that slices `visibleMenuItems` into `displayedItems` and `overflowItems`.
- Just render `visibleMenuItems` directly.
- Ensure the parent container has `overflow-y-auto` (The Shadcn `SidebarContent` usually handles this).
