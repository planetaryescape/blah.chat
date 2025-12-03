# Phase 0: Design System & Visual Identity

**Goal**: Establish distinctive visual identity. Not generic ChatGPT clone.

**Status**: Ready to start
**Dependencies**: None (shadcn/ui already initialized)
**Estimated Effort**: Design-first phase, creative decisions critical

---

## Overview

This phase establishes the visual DNA of blah.chat. The name is playful/casual - lean into that personality. Dark-first design. Avoid generic AI aesthetic (Inter fonts, purple gradients on white, predictable layouts).

**Key Principle**: Make unexpected choices that feel genuinely designed for context.

---

## Tasks

### 1. Typography Selection

**Avoid**: Inter, Roboto, Arial, system fonts, Space Grotesk (overused)

**Consider**:
- **Monospace options**: JetBrains Mono, Departure Mono, Berkeley Mono, Commit Mono, Iosevka
- **Display/Heading**: Gambarino, Söhne, Fraktion, Surt, Satoshi
- **Body text**: Geist, Untitled Sans, Relative, Sentient

**Decision needed**:
- Heading font
- Body font
- Code/monospace font (for code blocks, potentially input area)

**Implementation**:
```typescript
// app/layout.tsx
import { JetBrains_Mono, Sohne } from 'next/font/google'; // or @next/font/local

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const sans = Sohne({ subsets: ['latin'], variable: '--font-sans' });

// Apply: className={`${mono.variable} ${sans.variable}`}
```

```css
/* globals.css */
:root {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
}
```

---

### 2. Color System

**Avoid**: Purple gradients on white, generic blue/gray palettes

**Inspiration sources**:
- Code editor themes: Vesper, Rosé Pine, Catppuccin, Tokyo Night, Ayu, Dracula, Nord
- Cultural aesthetics: Japanese design (wabi-sabi), Brutalism, Swiss design

**Approach**: Dominant colors with sharp accents. Dark-first.

**Suggested starting points**:

**Option A - Warm Dark** (Vesper-inspired):
```css
:root {
  --background: 16 16 18; /* #101012 - deep charcoal */
  --foreground: 232 230 227; /* #e8e6e3 - warm white */

  --primary: 255 184 108; /* #ffb86c - warm orange */
  --primary-foreground: 16 16 18;

  --secondary: 139 233 253; /* #8be9fd - cyan accent */
  --secondary-foreground: 16 16 18;

  --muted: 68 71 90; /* #44475a - muted purple-gray */
  --muted-foreground: 169 174 193;

  --accent: 189 147 249; /* #bd93f9 - purple accent */
  --accent-foreground: 16 16 18;

  --destructive: 255 85 85; /* #ff5555 - red */

  --border: 40 42 54;
  --input: 68 71 90;
  --ring: 255 184 108;
}
```

**Option B - Cool Dark** (Tokyo Night-inspired):
```css
:root {
  --background: 26 27 38; /* #1a1b26 */
  --foreground: 192 202 245; /* #c0caf5 */

  --primary: 125 207 255; /* #7dcfff - sky blue */
  --primary-foreground: 26 27 38;

  --secondary: 187 154 247; /* #bb9af7 - purple */
  --secondary-foreground: 26 27 38;

  --accent: 158 206 106; /* #9ece6a - green */
  --accent-foreground: 26 27 38;

  --muted: 52 59 88;
  --muted-foreground: 86 95 137;

  --destructive: 247 118 142;

  --border: 41 46 73;
  --input: 52 59 88;
  --ring: 125 207 255;
}
```

**Option C - Minimal High-Contrast**:
```css
:root {
  --background: 10 10 10; /* near-black */
  --foreground: 250 250 250; /* near-white */

  --primary: 250 250 250; /* white */
  --primary-foreground: 10 10 10;

  --secondary: 140 140 140; /* gray */
  --secondary-foreground: 10 10 10;

  --accent: 250 250 250;
  --accent-foreground: 10 10 10;

  --muted: 40 40 40;
  --muted-foreground: 140 140 140;

  --destructive: 239 68 68;

  --border: 40 40 40;
  --input: 25 25 25;
  --ring: 250 250 250;
}
```

**Action**: Choose one OR create custom palette. Update `globals.css`.

---

### 3. Design Tokens

Update CSS variables for consistency:

```css
/* globals.css */
:root {
  /* Spacing scale */
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem; /* 8px */
  --spacing-md: 1rem; /* 16px */
  --spacing-lg: 1.5rem; /* 24px */
  --spacing-xl: 2rem; /* 32px */
  --spacing-2xl: 3rem; /* 48px */

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### 4. Component Theme Overrides

Customize shadcn/ui components to match aesthetic:

**Button variants**:
```typescript
// components/ui/button.tsx
// Add custom variants:
variants: {
  variant: {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    // ... existing
    ghost: "hover:bg-accent/10 hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  }
}
```

**Input styling**:
```typescript
// components/ui/input.tsx
// Custom focus states, background treatments
className={cn(
  "flex h-10 w-full rounded-md border border-input bg-background/50",
  "px-3 py-2 text-sm ring-offset-background",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
  className
)}
```

---

### 5. Layout & Composition

**Chat interface structure**:
```
┌─────────────────────────────────────────┐
│ [Sidebar - 280px]  │  [Main Content]    │
│                    │                     │
│  Conversations     │   [Chat Header]     │
│  - Pinned          │                     │
│  - Recent          │   [Messages]        │
│                    │   - Scrollable      │
│  [New Chat]        │   - Virtualized     │
│  [Search]          │                     │
│  [Settings]        │   [Input Area]      │
│                    │   - Expandable      │
│                    │   - Attachments     │
└─────────────────────────────────────────┘
```

**Spacing considerations**:
- Sidebar: compact but breathable (12px padding, 8px gaps)
- Main area: generous (24-32px padding)
- Message bubbles: clear separation (16px vertical gap)
- Input area: prominent, not cramped (min-height: 120px expanded)

---

### 6. Motion Principles

**What should animate**:
- Page transitions (sidebar expand/collapse)
- Message appearance (fade-up, stagger children)
- Button interactions (scale on press)
- Modal open/close
- Loading states (pulse, skeleton)

**What shouldn't animate**:
- Text streaming (character-by-character is animation enough)
- Scrolling (native is smooth)
- Real-time updates (jarring if animated)

**Implementation**:
```typescript
// Use framer-motion for complex animations
import { motion } from 'framer-motion';

// Message appear animation
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  {message.content}
</motion.div>

// Stagger children
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }}
>
  {items.map(item => <motion.div variants={itemVariants}>{item}</motion.div>)}
</motion.div>
```

**CSS animations for simple cases**:
```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: fade-up 0.2s ease-out;
}
```

---

### 7. Backgrounds & Atmosphere

**Avoid**: Solid colors everywhere

**Consider**:
- Subtle gradient overlays
- Noise textures (grain for depth)
- Geometric patterns (subtle)
- Context-specific treatments (chat area vs sidebar)

**Example - Chat area with subtle gradient**:
```css
.chat-main {
  background:
    radial-gradient(circle at 20% 80%, rgba(var(--accent), 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(var(--primary), 0.05) 0%, transparent 50%),
    rgb(var(--background));
}
```

**Example - Noise texture**:
```css
.chat-main::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/noise.png'); /* or SVG */
  opacity: 0.03;
  pointer-events: none;
}
```

---

### 8. Empty States

**Design delightful empty states**:

**New chat (no messages)**:
- Greeting message
- Example prompts (clickable)
- Model selector preview
- Illustration or icon (not generic, matches theme)

**No conversations**:
- Welcome message
- "Create your first conversation" CTA
- Quick tips or features highlight

**No search results**:
- "No matches found" with helpful suggestions
- Clear filters button

**Implementation pattern**:
```typescript
// components/chat/EmptyState.tsx
export function EmptyChatState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="mb-6">
        {/* Custom icon/illustration */}
      </div>
      <h2 className="text-2xl font-semibold mb-2">Start a conversation</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Choose a model and send your first message
      </p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {examplePrompts.map(prompt => (
          <button
            key={prompt.id}
            className="p-4 text-left border rounded-lg hover:border-primary transition-colors"
            onClick={() => sendPrompt(prompt.text)}
          >
            <div className="font-medium mb-1">{prompt.title}</div>
            <div className="text-sm text-muted-foreground">{prompt.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Deliverables

1. `globals.css` updated with chosen color system + design tokens
2. Font configuration in `app/layout.tsx`
3. shadcn/ui components customized (button, input, etc.)
4. Layout composition documented
5. Motion utilities set up (framer-motion or CSS)
6. Empty state components created
7. Background treatments applied

---

## Acceptance Criteria

- [ ] Visual identity feels distinctive (not generic AI app)
- [ ] Dark theme is cohesive and easy on eyes
- [ ] Typography is readable and matches personality
- [ ] Colors are harmonious with clear hierarchy
- [ ] Animations feel polished, not excessive
- [ ] Empty states are delightful, not boring
- [ ] Design system is documented and reusable

---

## Design Review Checkpoint

**Before proceeding to Phase 1**: Review design with screenshots/mockups of:
1. Chat interface (empty state)
2. Chat interface (with messages)
3. Sidebar
4. Model selector
5. Settings page

Get approval on visual direction before building functionality.

---

## Resources

**Fonts**:
- Google Fonts: https://fonts.google.com
- Fontshare: https://www.fontshare.com
- Fontsource: https://fontsource.org

**Color inspiration**:
- Vesper theme: https://github.com/raunofreiberg/vesper
- Tokyo Night: https://github.com/tokyo-night/tokyo-night-vscode-theme
- Catppuccin: https://catppuccin.com

**Motion**:
- Framer Motion: https://www.framer.com/motion
- Animation examples: https://motion.dev

**Icons** (if needed beyond shadcn):
- Lucide: https://lucide.dev (already used by shadcn)
- Phosphor: https://phosphoricons.com
- Tabler: https://tabler.io/icons
