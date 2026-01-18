# UI: Smooth Theme Transition

**Context:**
Toggling between Light and Dark mode.

**The Issue:**
The change is instant and jarring.

**Target File:**
`apps/web/src/components/ui/theme-provider.tsx` (or `mode-toggle.tsx`)

**Proposed Solution:**
Add a temporary transition class.

**Implementation Details:**
- When the toggle is clicked:
  1. Add class `theme-transition` to `document.body`.
  2. Wait 300ms.
  3. Remove class `theme-transition`.
- **CSS:**
  ```css
  .theme-transition, .theme-transition * {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
  }
  ```
