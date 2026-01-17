# UI: Glassmorphism Consistency

**Context:**
The "Obsidian Void" / "Stardust" visual theme.

**The Issue:**
The custom `surface-glass` utility isn't applied to standard Shadcn UI floating elements (Popovers, Dialogs), breaking the immersion.

**Target File:**
`apps/web/src/app/globals.css`

**Proposed Solution:**
Global CSS overrides.

**Implementation Details:**
```css
/* In globals.css */
.bg-popover {
  @apply bg-surface-glass backdrop-blur-xl border-white/10;
}
.bg-background {
  /* Ensure dialog overlays also get the glass treatment if desired, or keep them solid for contrast */
}
```
- Verify this doesn't break readability in Light mode.
