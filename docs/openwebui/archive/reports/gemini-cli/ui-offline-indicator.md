# UI: Offline Indicator

**Context:**
Network connection state.

**The Issue:**
The current indicator is too subtle ("OfflineQueueIndicator").

**Target File:**
`apps/web/src/components/layout/OfflineQueueIndicator.tsx`

**Proposed Solution:**
Make it more prominent but non-intrusive.

**Implementation Details:**
- Instead of a dot, render a thin banner at the very top of the app (z-index 50).
- **Style:** Amber/Yellow background (Light mode) or Dark Orange (Dark mode).
- **Text:** "You are offline. Changes will sync when connection is restored."
- **Icon:** `WifiOff`.
