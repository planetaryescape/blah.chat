# blah.chat Design System

## Overview

Corporate clean aesthetic. Dark-first, cool tones, professional typography with character.

**Inspiration**: Linear, Vercel

## Colors (OKLch)

### Dark Mode (Default)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(12% 0.015 240)` | Main background |
| `--foreground` | `oklch(98% 0.005 240)` | Main text |
| `--primary` | `oklch(65% 0.15 230)` | CTAs, links, focus |
| `--accent` | `oklch(70% 0.18 200)` | Badges, highlights (special) |
| `--secondary` | `oklch(25% 0.02 240)` | Subtle backgrounds |
| `--muted` | `oklch(20% 0.015 240)` | Disabled states |
| `--border` | `oklch(25% 0.02 240)` | Borders |
| `--sidebar` | `oklch(16% 0.015 240)` | Sidebar (slightly lighter) |

**Contrast**: AAA (17:1 foreground/background)

### Light Mode

| Token | Value |
|-------|-------|
| `--background` | `oklch(99% 0.002 240)` |
| `--foreground` | `oklch(15% 0.015 240)` |
| `--primary` | `oklch(50% 0.15 230)` |
| `--accent` | `oklch(55% 0.18 200)` |

**Contrast**: AAA (18:1)

### Usage Rules

- **Primary**: Main actions (buttons, links, active states)
- **Accent**: Special highlights (badges, notifications, important states)
- **NOT interchangeable** - accent reserved for emphasis

## Typography

### Fonts

- **Serif**: Fraunces (headings, logo, features)
- **Sans**: Inter (body, UI, buttons)
- **Mono**: JetBrains Mono (code blocks only)

**Source**: Google Fonts via Next.js font optimization

### Scale

```
xs:   12px / 16px
sm:   14px / 20px
base: 16px / 24px
lg:   18px / 28px
xl:   20px / 28px
2xl:  24px / 32px
3xl:  30px / 36px
4xl:  36px / 40px
```

### Usage

- Default: `font-sans` (Inter)
- Headings (h1-h4), logo: `font-serif` (Fraunces)
- Code: `font-mono` (JetBrains Mono)

### Examples

```tsx
<h1 className="font-serif text-4xl">Heading</h1>
<p className="font-sans text-base">Body text</p>
<code className="font-mono text-sm">code</code>
```

## Spacing

Base: 4px

```
--space-xs:  4px
--space-sm:  8px
--space-md:  16px
--space-lg:  24px
--space-xl:  32px
--space-2xl: 48px
```

## Border Radius

```
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

## Shadows

Neutral (no tint):

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.1)
--shadow-md: 0 4px 6px rgba(0,0,0,0.15)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.2)
```

## Motion

```
--transition-fast: 150ms (hover, active states)
--transition-base: 250ms (theme switch, UI changes)
--transition-slow: 400ms (page transitions)
```

Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

## Accessibility

- All colors WCAG AAA (main text)
- Focus indicators visible (`--ring`)
- Reduced motion support (use `prefers-reduced-motion`)
- Semantic HTML

## Component Patterns

### Buttons

- Primary: `bg-primary text-primary-foreground`
- Secondary: `bg-secondary text-secondary-foreground`
- Accent: `bg-accent text-accent-foreground` (special only)

### Cards

- Background: `bg-card`
- Border: `border-border`
- Hover: `hover:bg-secondary transition-colors`

### Inputs

- Background: `bg-input`
- Border: `border-border`
- Focus: `focus:ring-ring`

## Dark/Light Modes

- **Default**: Dark
- **System**: Respects OS preference
- **Persistence**: localStorage via next-themes
- **Switcher**: Sidebar footer (System/Light/Dark)
