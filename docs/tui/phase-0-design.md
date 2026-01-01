# Phase 0: UI/UX Design System

## Context

This phase establishes the visual identity and design system for the blah.chat TUI **before any code is written**. Design is not an afterthought—it's the foundation that makes the app feel premium, bespoke, and professionally crafted.

### Why Design First?

1. **Consistency**: Every component follows the same visual language
2. **Brand alignment**: TUI feels like a sibling to the web app
3. **Decision framework**: Design specs prevent ad-hoc choices during implementation
4. **Premium feel**: Intentional design separates professional apps from hobby projects

### What Comes After

- **Phase 1A**: Shared hooks (data layer)
- **Phase 1B**: CLI scaffold (will apply this design system)
- All subsequent phases reference this document

## blah.chat Brand DNA

### Web App Visual Identity

The web app has a distinctive, warm aesthetic—**not generic AI slop**:

**Light Mode (Stardust)**
- Background: Warm cream `oklch(94% 0.01 80)`
- Foreground: Deep brown `oklch(20% 0.02 80)`
- Primary: Warm gold/amber `oklch(60% 0.16 70)`
- Accent: Deep orange `oklch(65% 0.18 40)`

**Dark Mode (Obsidian Void)**
- Background: Deep indigo `oklch(20% 0.03 285)`
- Foreground: Light cream `oklch(98% 0.01 285)`
- Primary: Rose quartz `oklch(90% 0.03 25)` ← **Signature accent**
- Sidebar: Darkest indigo `oklch(18% 0.035 285)`
- Cards: Lighter indigo `oklch(25% 0.04 285)`

**Typography**
- Display/UI: Manrope (modern, friendly)
- Code: JetBrains Mono (professional)

**Distinctive Elements**
- Grain texture overlay (subtle noise)
- Glassmorphism (backdrop blur + saturate)
- Mesh gradient backgrounds
- Rose quartz on deep indigo (signature pairing)
- Micro-interactions with spring physics

---

## TUI Design System

### Color Palette (Terminal-Mapped)

Map the web palette to terminal-compatible colors:

```
╭─────────────────────────────────────────────────────────╮
│                    OBSIDIAN VOID                        │
│              (Primary Dark Theme)                       │
╰─────────────────────────────────────────────────────────╯

Background Layers:
┌─────────────────┬─────────────────┬─────────────────────┐
│ base            │ #1a1b26         │ Deep indigo void    │
│ surface         │ #24283b         │ Cards/panels        │
│ overlay         │ #414868         │ Hover states        │
└─────────────────┴─────────────────┴─────────────────────┘

Foreground:
┌─────────────────┬─────────────────┬─────────────────────┐
│ text            │ #c0caf5         │ Primary text        │
│ subtext         │ #565f89         │ Secondary/muted     │
│ subtle          │ #3b4261         │ Borders, dividers   │
└─────────────────┴─────────────────┴─────────────────────┘

Accents (Signature Colors):
┌─────────────────┬─────────────────┬─────────────────────┐
│ rose            │ #f7768e         │ PRIMARY - User msgs │
│ gold            │ #e0af68         │ Warnings, cost      │
│ foam            │ #7dcfff         │ AI responses, info  │
│ iris            │ #bb9af7         │ Model names         │
│ pine            │ #9ece6a         │ Success states      │
└─────────────────┴─────────────────┴─────────────────────┘

Semantic:
┌─────────────────┬─────────────────┬─────────────────────┐
│ success         │ #9ece6a         │ ✓ Complete          │
│ warning         │ #e0af68         │ ⚠ Caution          │
│ error           │ #f7768e         │ ✗ Failed            │
│ info            │ #7dcfff         │ ℹ Information       │
└─────────────────┴─────────────────┴─────────────────────┘
```

### Terminal Color Implementation

```typescript
// apps/cli/src/lib/colors.ts

export const colors = {
  // Background layers
  base: '#1a1b26',
  surface: '#24283b',
  overlay: '#414868',

  // Foreground
  text: '#c0caf5',
  subtext: '#565f89',
  subtle: '#3b4261',

  // Signature accents
  rose: '#f7768e',      // User messages, primary actions
  gold: '#e0af68',      // Warnings, cost indicators
  foam: '#7dcfff',      // AI responses, info
  iris: '#bb9af7',      // Model names, special
  pine: '#9ece6a',      // Success

  // Semantic aliases
  user: '#f7768e',      // Rose for user
  assistant: '#7dcfff', // Foam for AI
  system: '#bb9af7',    // Iris for system

  // Status
  success: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
  info: '#7dcfff',
} as const;
```

---

## Typography & Spacing

### Terminal Font Hierarchy

Since terminals use monospace fonts, create hierarchy through:

```
EMPHASIS HIERARCHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Level 1: HEADERS
  ▸ Bold + color (rose/foam)
  ▸ UPPERCASE for section headers
  ▸ Full-width borders below

Level 2: Labels
  ▸ Bold + subtext color
  ▸ Sentence case

Level 3: Body text
  ▸ Normal weight
  ▸ Primary text color

Level 4: Metadata
  ▸ Dim/subtext color
  ▸ Smaller visual weight (no bold)
```

### Spacing Scale

```
SPACING SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Horizontal:
  xs: 1 char    │ Tight inline spacing
  sm: 2 chars   │ Between label and value
  md: 3 chars   │ Panel padding
  lg: 4 chars   │ Section gaps

Vertical:
  xs: 0 lines   │ Related items
  sm: 1 line    │ Between messages
  md: 2 lines   │ Section breaks
  lg: 3 lines   │ Major divisions

Panel Padding:
  ╭─ Section ──────────────────╮
  │                            │  ← 1 line top
  │  Content with 2-char pad   │  ← 2 char sides
  │                            │  ← 1 line bottom
  ╰────────────────────────────╯
```

---

## Component Specifications

### Message Bubbles

```
USER MESSAGE (Rose accent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                                    ╭─ You ──────────────╮
                                    │ Your message here  │
                                    │ spans multiple     │
                                    │ lines naturally    │
                                    ╰────────────────────╯
                                                    12:34

  ▸ Right-aligned (visual distinction)
  ▸ Rose colored border
  ▸ "You" label in rose
  ▸ Timestamp below, right-aligned, subtext color


AI MESSAGE (Foam accent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─ claude-opus ────────────────────────────────────────────╮
│                                                          │
│  Response text flows naturally across the full width    │
│  of the terminal with proper padding on all sides.      │
│                                                          │
│  💭 Reasoning: When thinking models are used, show      │
│     reasoning in italicized subtext color               │
│                                                          │
╰──────────────────────────────────────────────────────────╯
◉ 156 tokens · $0.02 · 1.2s                          12:35

  ▸ Left-aligned (full width)
  ▸ Foam colored border
  ▸ Model name in iris
  ▸ Reasoning block (if present) indented with 💭
  ▸ Stats below: tokens (◉), cost ($), time
  ▸ Timestamp right-aligned


STREAMING STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─ claude-opus ────────────────────────────────────────────╮
│                                                          │
│  The response streams in character by character         │
│  showing partial content as it generates...▊            │
│                                                          │
╰──────────────────────────────────────────────────────────╯
⠋ Generating... 42 tokens

  ▸ Blinking cursor (▊) at end of content
  ▸ Braille spinner (⠋) in footer
  ▸ Live token count
  ▸ Border color slightly muted during generation
```

### Conversation List

```
CONVERSATION ITEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Default State:
  │    How to implement OAuth 2.0 flow      claude-opus   2h │

Selected State:
  │ ▸  How to implement OAuth 2.0 flow      claude-opus   2h │
  └────────────────────────────────────────────────────────────┘
     ↑ Selection indicator    ↑ Model (iris)  ↑ Time (subtext)

With Indicators:
  │ 📌 Pinned conversation title here       gpt-4o        1d │
  │ ⭐ Starred conversation title           claude-opus   3d │


LIST CONTAINER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─ Conversations ──────────────────────────────────────────╮
│                                                          │
│  📌 Pinned: OAuth implementation          claude    2h   │
│  ⭐ Starred: API design patterns          gpt-4o    1d   │
│  ─────────────────────────────────────────────────────   │
│  ▸  How to use React hooks               claude    3m   │
│     Database schema design               gemini    1h   │
│     CSS Grid vs Flexbox                  gpt-4o    2h   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  j/k: navigate   Enter: open   n: new   /: search       │
╰──────────────────────────────────────────────────────────╯
```

### Input Area

```
INPUT COMPONENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Empty State:
╭─ Message ────────────────────────────────────────────────╮
│ Type your message...                                     │
╰──────────────────────────────────────────────────────────╯
  claude-opus · Temperature: 0.7              Enter to send

Active State (typing):
╭─ Message ────────────────────────────────────────────────╮
│ How do I implement a custom hook that█                   │
╰──────────────────────────────────────────────────────────╯
  claude-opus · Temperature: 0.7              Enter to send

Disabled State (generating):
╭─ Message ────────────────────────────────────────────────╮
│ ⠋ Generating response...                                 │
╰──────────────────────────────────────────────────────────╯

  ▸ Border color: foam when focused, subtle when not
  ▸ Placeholder in subtext color
  ▸ Model name in iris below
  ▸ Right-aligned hint text
```

### Status Indicators

```
STATUS SYMBOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Loading/Progress:
  ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏   Braille spinner (smooth)
  ▁ ▂ ▃ ▄ ▅ ▆ ▇ █         Progress blocks
  ◐ ◓ ◑ ◒                  Pie spinner (simple)

State Indicators:
  ◉  Active/selected (filled circle)
  ○  Inactive (empty circle)
  ◐  In progress (half circle)
  ✓  Success (check) - pine color
  ✗  Error (cross) - rose color
  ⚠  Warning (triangle) - gold color
  ℹ  Info (i) - foam color

Message Status:
  ◌  Pending (ring)
  ⠋  Generating (spinner)
  ✓  Complete (check)
  ✗  Failed (cross)
  ◼  Stopped (square)

Navigation:
  ▸  Selected/active item
  ▹  Expandable (collapsed)
  ▾  Expandable (expanded)
  →  Forward/next
  ←  Back/previous

Special:
  📌  Pinned
  ⭐  Starred
  💭  Reasoning/thinking
  ◆  Model indicator
```

---

## Layout Architecture

### Main Application Layout

```
FULL SCREEN LAYOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────┐
│  blah.chat                              user@email.com  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    CONTENT AREA                         │
│                                                         │
│               (Conversations/Chat/etc)                  │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  j/k: nav   Enter: select   n: new   /: search   ?: help│
└─────────────────────────────────────────────────────────┘

  ▸ Header: Brand + user info
  ▸ Content: Main view (fills space)
  ▸ Footer: Context-sensitive shortcuts
```

### Chat View Layout

```
CHAT VIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─ OAuth 2.0 implementation ──────────────── claude-opus ─┐
│                                                         │
│  ╭─ You ────────────────────────────────────────────╮  │
│  │ How do I implement OAuth 2.0 in my Node app?     │  │
│  ╰──────────────────────────────────────────────────╯  │
│                                                   12:34 │
│                                                         │
│  ╭─ claude-opus ────────────────────────────────────╮  │
│  │                                                   │  │
│  │  OAuth 2.0 implementation involves several       │  │
│  │  key steps. Here's a comprehensive guide...      │  │
│  │                                                   │  │
│  ╰──────────────────────────────────────────────────╯  │
│  ◉ 342 tokens · $0.04 · 2.1s                     12:35 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ╭─ Message ────────────────────────────────────────╮  │
│  │ Follow up question here...█                      │  │
│  ╰──────────────────────────────────────────────────╯  │
│  claude-opus · Temp: 0.7                  Enter to send │
├─────────────────────────────────────────────────────────┤
│  Esc: back   m: model   ?: help                         │
└─────────────────────────────────────────────────────────┘
```

---

## Animation & Motion

### Loading Animations

```typescript
// Spinner component
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80; // ms - smooth rotation

// Cursor blink
const CURSOR_FRAMES = ['▊', ' '];
const CURSOR_INTERVAL = 530; // ms - natural blink rate
```

### Transition Patterns

```
ENTER ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Messages: Fade in from bottom (slide up 1 line)
  ▸ Duration: 150ms
  ▸ Stagger: 50ms between messages

Panels: Slide from direction of origin
  ▸ Duration: 200ms
  ▸ Ease: ease-out

Selections: Instant highlight
  ▸ Duration: 0ms (immediate feedback)

EXIT ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Modal close: Fade out
  ▸ Duration: 100ms

View switch: Cross-fade
  ▸ Duration: 150ms
```

---

## Visual Polish Details

### Border Styles

```
BORDER CHARACTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primary (rounded - friendly, modern):
  ╭ ─ ╮
  │   │
  ╰ ─ ╯

Secondary (single - professional):
  ┌ ─ ┐
  │   │
  └ ─ ┘

Emphasis (heavy - important):
  ┏ ━ ┓
  ┃   ┃
  ┗ ━ ┛

Dividers:
  ───────────  Solid line
  ─ ─ ─ ─ ─   Dashed (gaps)
  · · · · ·   Dotted (subtle)
```

### Visual Hierarchy Patterns

```
SECTION HEADER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option 1: Box with title
╭─ SETTINGS ───────────────────────────────────────────────╮
│                                                          │

Option 2: Underlined
SETTINGS
────────────────────────────────────────────────────────────

Option 3: Accent bar
▌ SETTINGS
│

Option 4: Gradient text (ink-gradient)
█▓▒░ SETTINGS ░▒▓█
```

---

## Theme Variants

### Dark Theme (Primary)

```typescript
export const darkTheme = {
  name: 'obsidian-void',

  // Backgrounds
  bg: { base: '#1a1b26', surface: '#24283b', overlay: '#414868' },

  // Foregrounds
  fg: { text: '#c0caf5', subtext: '#565f89', subtle: '#3b4261' },

  // Accents
  accent: {
    rose: '#f7768e',
    gold: '#e0af68',
    foam: '#7dcfff',
    iris: '#bb9af7',
    pine: '#9ece6a',
  },

  // Semantic
  status: {
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    info: '#7dcfff',
  },

  // Borders
  border: { default: '#3b4261', focus: '#7dcfff', active: '#f7768e' },
};
```

### Light Theme (Secondary)

```typescript
export const lightTheme = {
  name: 'stardust',

  // Backgrounds (warm cream)
  bg: { base: '#faf4ed', surface: '#fffaf3', overlay: '#f2e9e1' },

  // Foregrounds (deep brown)
  fg: { text: '#575279', subtext: '#797593', subtle: '#9893a5' },

  // Accents (warm earth tones)
  accent: {
    rose: '#b4637a',    // Muted rose
    gold: '#ea9d34',    // Warm gold
    foam: '#286983',    // Deep teal
    iris: '#907aa9',    // Dusty purple
    pine: '#56949f',    // Sage
  },

  // Semantic
  status: {
    success: '#56949f',
    warning: '#ea9d34',
    error: '#b4637a',
    info: '#286983',
  },

  // Borders
  border: { default: '#dfdad9', focus: '#286983', active: '#b4637a' },
};
```

---

## Implementation Checklist

### Phase 0 Deliverables

- [ ] Create `apps/cli/src/lib/theme.ts` with color definitions
- [ ] Create `apps/cli/src/lib/borders.ts` with box characters
- [ ] Create `apps/cli/src/lib/symbols.ts` with status indicators
- [ ] Create `apps/cli/src/components/ui/` base components:
  - [ ] `Box.tsx` - Themed container with borders
  - [ ] `Text.tsx` - Themed text with hierarchy
  - [ ] `Spinner.tsx` - Braille loading animation
  - [ ] `Badge.tsx` - Status/label badges
  - [ ] `Divider.tsx` - Section separators
- [ ] Create design tokens documentation
- [ ] Verify colors work in 256-color and truecolor terminals
- [ ] Test graceful degradation for basic terminals

### Quality Criteria

1. **Brand Alignment**: Colors and patterns match web app identity
2. **Visual Hierarchy**: Clear distinction between UI levels
3. **Consistency**: Same patterns used throughout
4. **Polish**: Animations smooth, spacing intentional
5. **Accessibility**: Works in various terminal emulators

---

## Reference Materials

### Color Testing

```bash
# Test terminal color support
echo $TERM
echo $COLORTERM

# Test true color
printf "\x1b[38;2;255;100;0mTruecolor test\x1b[0m\n"

# Test 256 color
printf "\x1b[38;5;196mTest 256 colors\x1b[0m\n"
```

### Box Drawing Test

```
╭─────────────────────╮
│ Rounded corners     │
╰─────────────────────╯

┌─────────────────────┐
│ Square corners      │
└─────────────────────┘

┏━━━━━━━━━━━━━━━━━━━━━┓
┃ Heavy borders       ┃
┗━━━━━━━━━━━━━━━━━━━━━┛
```

### Inspiration Sources

- **Charm.sh** - Lip Gloss, Bubble Tea (glamorous CLI)
- **lazygit** - Dense information, vim navigation
- **Warp Terminal** - Modern terminal design
- **Rosé Pine** - Warm dark theme
- **Tokyo Night** - Cool modern theme
- **Catppuccin** - Pastel accents

---

## Next Phase

After establishing this design system, proceed to [Phase 1A: Shared Hooks](./phase-1a-shared-hooks.md). All UI components built in subsequent phases should reference this document for visual specifications.
