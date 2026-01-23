# UI/UX Improvements Index

> **Research Date**: 2026-01-16
> **Source**: Comprehensive analysis of Open WebUI, blah.chat codebase, and industry best practices

This directory contains self-contained documentation for specific UI/UX improvements. Each file provides complete context, problem description, and implementation guidance that can be actioned independently.

---

## Priority Matrix

| Priority | File | Area | Effort | Impact |
|----------|------|------|--------|--------|
| **P0** | [01-draft-persistence.md](./01-draft-persistence.md) | Input | Low | High |
| **P0** | [02-scroll-threshold.md](./02-scroll-threshold.md) | Scroll | Low | Medium |
| **P0** | [03-ime-composition-guard.md](./03-ime-composition-guard.md) | Input | Low | High |
| **P1** | [04-streaming-smoothness.md](./04-streaming-smoothness.md) | Streaming | Medium | High |
| **P1** | [05-status-timeline.md](./05-status-timeline.md) | Tools | Medium | Medium |
| **P1** | [06-haptic-feedback.md](./06-haptic-feedback.md) | Polish | Low | Medium |
| **P2** | [07-high-contrast-mode.md](./07-high-contrast-mode.md) | Accessibility | Medium | Medium |
| **P2** | [08-ui-scale-setting.md](./08-ui-scale-setting.md) | Accessibility | Medium | Medium |
| **P2** | [09-rtl-support.md](./09-rtl-support.md) | Accessibility | Medium | Low |
| **P2** | [10-collapsible-code-blocks.md](./10-collapsible-code-blocks.md) | Code | Medium | Medium |
| **P2** | [11-time-based-sidebar-grouping.md](./11-time-based-sidebar-grouping.md) | Navigation | Medium | Medium |
| **P3** | [12-message-send-animation.md](./12-message-send-animation.md) | Polish | Low | Low |
| **P3** | [13-delete-confirmation.md](./13-delete-confirmation.md) | Safety | Low | Medium |
| **P3** | [14-keyboard-navigation-enhancements.md](./14-keyboard-navigation-enhancements.md) | A11y | Medium | Medium |
| **P3** | [15-mobile-safe-area-handling.md](./15-mobile-safe-area-handling.md) | Mobile | Low | Medium |
| **P3** | [16-reduced-motion-support.md](./16-reduced-motion-support.md) | A11y | Low | Medium |
| **P3** | [17-focus-management.md](./17-focus-management.md) | A11y | Medium | Medium |
| **P3** | [18-paste-handling.md](./18-paste-handling.md) | Input | Medium | Medium |

---

## Quick Wins (< 1 hour each)

1. **Draft Persistence** - Save input to sessionStorage with debounce
2. **Scroll Threshold** - Change 100px → 50px
3. **IME Guard** - Add composition event handling
4. **Haptic Feedback** - Add `navigator.vibrate()` calls
5. **Reduced Motion** - Add `prefers-reduced-motion` media query

---

## Architecture Strengths (Keep These)

blah.chat already excels in areas where Open WebUI struggles:

- **Resilient Generation** - Server-side streaming survives page refresh
- **Optimistic Updates** - Instant message feedback
- **Virtualization** - React Virtuoso at 500+ messages
- **Dexie Caching** - IndexedDB for instant local reads
- **Offline Queue** - Exponential backoff retry

These are architectural decisions that can't be easily retrofitted - blah.chat's foundation is solid.

---

## Reading Order

**For immediate polish:**
1. Start with P0 items (draft persistence, scroll threshold, IME guard)
2. Move to P1 for streaming improvements and tool status

**For accessibility compliance:**
1. High contrast mode (#07)
2. UI scale setting (#08)
3. Reduced motion (#16)
4. Focus management (#17)

**For mobile polish:**
1. Safe area handling (#15)
2. IME composition (#03)
3. Mobile-specific scroll (#02)

---

## File Naming Convention

- `00-INDEX.md` - This file
- `01-XX.md` through `09-XX.md` - Single-digit for ordering
- `10-XX.md` onwards - Double-digit for additional items

Each file follows the same structure:
1. **Summary** - One-line description
2. **Current State** - What exists now (with code references)
3. **Problem** - What's wrong or missing
4. **Solution** - Implementation details with code
5. **Files to Modify** - Exact file paths
6. **Testing** - How to verify the fix
7. **References** - Industry standards, Open WebUI patterns
