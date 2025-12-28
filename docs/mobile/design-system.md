# Mobile Design System

Source of truth for mobile app styling. All components must follow these guidelines.

---

## Theme Files

All theme values live in `apps/mobile/lib/theme/`:

```
lib/theme/
├── index.ts      # Centralized exports
├── colors.ts     # Color palette
├── fonts.ts      # Font families
├── typography.ts # Text styles
└── spacing.ts    # Spacing & radius
```

Import via: `import { colors, fonts, spacing, radius } from "@/lib/theme"`

---

## Colors (Obsidian Void)

Deep indigo base with rose quartz accents. Matches web app dark theme.

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#1a1625` | Screen backgrounds |
| `foreground` | `#fafafa` | Primary text |
| `primary` | `#F4E0DC` | Rose quartz - CTAs, accents |
| `primaryForeground` | `#1a1625` | Text on primary |
| `secondary` | `#2d2640` | Lighter indigo - cards, inputs |
| `card` | `#252035` | Card backgrounds |
| `border` | `#3d3555` | Borders, dividers |
| `muted` | `#2d2640` | Muted backgrounds |
| `mutedForeground` | `#a1a1aa` | Secondary text |
| `ring` | `#F4E0DC` | Focus rings |

### Message Colors
| Token | Value | Usage |
|-------|-------|-------|
| `userBubble` | `#F4E0DC` | User message background |
| `userBubbleText` | `#1a1625` | User message text |
| `aiBubble` | `#252035` | AI message background |
| `aiBubbleText` | `#fafafa` | AI message text |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `success` | `#22c55e` | Success states |
| `error` | `#ef4444` | Errors, destructive |
| `generating` | `#F4E0DC` | Generation indicator |
| `star` | `#fbbf24` | Starred items |
| `link` | `#60a5fa` | Links |

---

## Typography

### Font Families

| Token | Font | Usage |
|-------|------|-------|
| `fonts.heading` | Syne_700Bold | Page titles, h1 |
| `fonts.headingMedium` | Syne_600SemiBold | Section headers, h2/h3 |
| `fonts.headingRegular` | Syne_400Regular | Light headings |
| `fonts.body` | Manrope_400Regular | Body text |
| `fonts.bodyMedium` | Manrope_500Medium | Labels, emphasis |
| `fonts.bodySemibold` | Manrope_600SemiBold | Buttons, strong text |
| `fonts.bodyBold` | Manrope_700Bold | Bold text |
| `fonts.mono` | System monospace | Code blocks |

### Text Styles

Use presets from `typography.ts`:

```typescript
// Headings
typography.h1  // 28px Syne Bold
typography.h2  // 22px Syne SemiBold
typography.h3  // 18px Syne SemiBold

// Body
typography.body       // 16px Manrope Regular
typography.bodyMedium // 16px Manrope Medium
typography.bodySmall  // 14px Manrope Regular
typography.caption    // 12px Manrope Regular

// UI
typography.button      // 16px Manrope SemiBold
typography.buttonSmall // 14px Manrope SemiBold
typography.label       // 14px Manrope Medium
```

---

## Spacing

4px base grid. Use tokens, not raw numbers.

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.xs` | 4px | Tight gaps |
| `spacing.sm` | 8px | Small gaps, icon padding |
| `spacing.md` | 16px | Standard padding |
| `spacing.lg` | 24px | Section spacing |
| `spacing.xl` | 32px | Large spacing |
| `spacing["2xl"]` | 48px | Extra large |
| `spacing["3xl"]` | 64px | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 8px | Small elements, badges |
| `radius.md` | 12px | Buttons, inputs |
| `radius.lg` | 16px | Cards, modals |
| `radius.xl` | 20px | Large cards |
| `radius["2xl"]` | 24px | Bottom sheets |
| `radius.full` | 9999px | Pills, avatars |

---

## Component Patterns

### Buttons

```typescript
// Primary button
{
  backgroundColor: colors.primary,
  borderRadius: radius.lg,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
}

// Button text
{
  fontFamily: fonts.bodySemibold,
  fontSize: 16,
  color: colors.primaryForeground,
}

// Disabled state
{ opacity: 0.4 }
```

### Inputs

```typescript
{
  fontFamily: fonts.body,
  fontSize: 16,
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
}

// Focused state
{ borderColor: colors.ring }
```

### Cards

```typescript
{
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.md,
}
```

### Message Bubbles

```typescript
// User message (right-aligned)
{
  backgroundColor: colors.userBubble,
  borderRadius: radius.lg,
  borderTopRightRadius: radius.sm, // Flat corner
  maxWidth: "85%",
  alignSelf: "flex-end",
}

// AI message (left-aligned)
{
  backgroundColor: colors.aiBubble,
  borderRadius: radius.lg,
  borderTopLeftRadius: radius.sm, // Flat corner
  borderWidth: 1,
  borderColor: colors.border,
  maxWidth: "85%",
  alignSelf: "flex-start",
}
```

### Section Headers

```typescript
{
  fontFamily: fonts.bodySemibold,
  fontSize: 11,
  color: colors.mutedForeground,
  textTransform: "uppercase",
  letterSpacing: 0.5,
}
```

### Badges/Pills

```typescript
{
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: radius.full,
  backgroundColor: colors.secondary,
}
```

---

## Icons

Use `lucide-react-native` exclusively. Standard sizes:

| Context | Size |
|---------|------|
| Navigation | 18-20px |
| Inline with text | 14-16px |
| Buttons | 18px |
| Empty states | 32px |
| Hero/Logo | 28px |

---

## Do's and Don'ts

### Do
- Import from `@/lib/theme`
- Use spacing tokens for all margins/padding
- Use font family tokens, never raw font names
- Use radius tokens for all rounded corners
- Match component patterns above

### Don't
- Hardcode color hex values
- Use arbitrary pixel values for spacing
- Mix font families inconsistently
- Create new color tokens without updating this doc
- Use different radius values for similar components

---

## Adding New Colors

1. Add to `apps/mobile/lib/theme/colors.ts`
2. Update this documentation
3. Ensure contrast ratio meets WCAG AA (4.5:1 for text)

## Adding New Components

1. Follow existing patterns above
2. Use theme tokens exclusively
3. Add pattern to this doc if reusable

---

## Related Files

- Web theme: `apps/web/src/app/globals.css` (CSS variables)
- Shared models: `packages/ai/src/models.ts`
- Mobile components: `apps/mobile/components/`
