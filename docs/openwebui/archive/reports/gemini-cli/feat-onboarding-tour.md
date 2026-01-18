# Feature: Onboarding Tour

**Context:**
New user experience.

**The Issue:**
New users land with no guidance. The code has `data-tour` attributes, but no tour is active.

**Target Files:**
`apps/web/src/components/sidebar/app-sidebar.tsx`, `apps/web/src/components/chat/ChatInput.tsx`

**Proposed Solution:**
Activate the tour.

**Implementation Details:**
- Integrate a library like `driver.js` or `react-joyride` (or build a simple custom one).
- Check for a `hasSeenOnboarding` flag in user preferences.
- If false, start the tour:
  1.  Sidebar "New Chat" (`data-tour="new-chat"`).
  2.  Projects (`data-tour="projects"`).
  3.  Input Area (`data-tour="input"`).
