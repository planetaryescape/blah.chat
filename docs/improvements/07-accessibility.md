# Accessibility: WCAG AA Compliance (CRITICAL)

## Context

**Priority:** CRITICAL - User specified comprehensive accessibility is mandatory

**Goals:**
- WCAG AA compliance (4.5:1 color contrast minimum)
- Full screen reader support
- Complete keyboard navigation
- Semantic HTML throughout
- ARIA labels on all interactive elements

---

## 1. Skip-to-Content Link

**File:** `src/app/(main)/layout.tsx`

```typescript
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* Skip link - visible only on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <AppSidebar />

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
```

**Add .sr-only utility to globals.css:**

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 2. Semantic HTML & Landmark Regions

**Navigation:**
```typescript
// app-sidebar.tsx
<aside role="navigation" aria-label="Main navigation">
  <nav>
    {/* menu items */}
  </nav>
</aside>
```

**Main Content:**
```typescript
// layout.tsx
<main id="main-content" role="main" aria-label="Chat interface">
  {children}
</main>
```

**Search:**
```typescript
// SearchBar.tsx
<div role="search" aria-label="Search conversations">
  <input type="search" ... />
</div>
```

---

## 3. ARIA Labels on Interactive Elements

### ChatInput

```typescript
<form
  role="search"
  aria-label="Send message form"
  onSubmit={handleSubmit}
>
  <Textarea
    ref={textareaRef}
    aria-label="Message input"
    aria-describedby="input-hint"
    aria-invalid={error ? "true" : "false"}
    aria-multiline="true"
  />

  <div id="input-hint" className="sr-only">
    Type your message. Press Enter to send, Shift+Enter for new line
  </div>

  <Button
    type="submit"
    aria-label={isRecording ? "Stop recording and send" : "Send message"}
    aria-disabled={!input.trim()}
  >
    <Send className="w-4 h-4" />
  </Button>
</form>
```

### ModelSelector

```typescript
<DropdownMenu>
  <DropdownMenuTrigger
    aria-label="Select AI model"
    aria-expanded={open}
    aria-haspopup="menu"
    aria-controls="model-menu"
  >
    {selectedModel}
  </DropdownMenuTrigger>

  <DropdownMenuContent
    id="model-menu"
    role="menu"
    aria-label="Available AI models"
  >
    <DropdownMenuItem
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => onChange(model.id)}
    >
      {model.name}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Message List

```typescript
<div
  role="log"
  aria-live="polite"
  aria-label="Chat message history"
  aria-atomic="false"
>
  {messages.map((msg) => (
    <article
      key={msg._id}
      role="article"
      aria-label={`${msg.role} message`}
      aria-describedby={`msg-${msg._id}-content`}
      tabIndex={0}
    >
      <div id={`msg-${msg._id}-content`}>
        {msg.content}
      </div>
    </article>
  ))}
</div>
```

### Conversation List

```typescript
<div
  role="listbox"
  aria-label="Conversations"
  aria-activedescendant={selectedIndex >= 0 ? `conv-${selectedIndex}` : undefined}
>
  {conversations.map((conv, index) => (
    <div
      key={conv._id}
      id={`conv-${index}`}
      role="option"
      aria-selected={index === selectedIndex}
      aria-label={`Conversation: ${conv.title}`}
      tabIndex={index === selectedIndex ? 0 : -1}
    >
      {conv.title}
    </div>
  ))}
</div>
```

### Command Palette

```typescript
<Dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="command-title"
  aria-describedby="command-desc"
>
  <h2 id="command-title" className="sr-only">
    Command Palette
  </h2>
  <p id="command-desc" className="sr-only">
    Search for commands, conversations, and actions. Use arrow keys to navigate, Enter to select.
  </p>

  <CommandInput
    aria-label="Search commands and conversations"
    aria-autocomplete="list"
    aria-controls="command-list"
  />

  <CommandList id="command-list" role="listbox">
    {/* items */}
  </CommandList>
</Dialog>
```

### Buttons

```typescript
// Icon-only buttons MUST have aria-label
<Button
  variant="ghost"
  size="icon"
  aria-label="New conversation"
  onClick={handleNewChat}
>
  <Plus className="w-4 h-4" aria-hidden="true" />
</Button>

// Toggle buttons
<Button
  variant="ghost"
  size="icon"
  aria-label="Toggle sidebar"
  aria-pressed={sidebarOpen}
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  <Menu className="w-4 h-4" aria-hidden="true" />
</Button>

// Loading states
<Button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? "Loading..." : "Submit"}
</Button>
```

---

## 4. Screen Reader Announcements

### Streaming Messages

```typescript
// In ChatMessage.tsx
{message.status === "generating" && (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {isThinkingModel
      ? "AI is thinking about your question"
      : "AI is generating a response"}
  </div>
)}

{message.status === "complete" && (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    Response complete. {message.outputTokens} tokens generated
    {message.firstTokenAt && message.generationStartedAt &&
      ` in ${((message.firstTokenAt - message.generationStartedAt) / 1000).toFixed(1)} seconds`}
  </div>
)}

{message.status === "error" && (
  <div
    role="alert"
    aria-live="assertive"
    className="sr-only"
  >
    Error generating response: {message.error}
  </div>
)}
```

### Navigation Announcements

```typescript
// When navigating with arrow keys
<div role="status" aria-live="polite" className="sr-only">
  {selectedIndex >= 0 &&
    `Selected conversation ${selectedIndex + 1} of ${conversations.length}: ${conversations[selectedIndex].title}`}
</div>

// When jumping with ⌘1-9
<div role="status" aria-live="assertive" className="sr-only">
  {jumpedTo && `Opened conversation: ${jumpedTo.title}`}
</div>
```

### Notifications

```typescript
// Success/error toasts
toast.success("Message copied", {
  role: "status",
  "aria-live": "polite",
});

toast.error("Failed to send message", {
  role: "alert",
  "aria-live": "assertive",
});
```

---

## 5. Focus Management

### Modal Dialogs

```typescript
// Use Dialog component from shadcn/ui (already accessible)
// Focus trap automatically handled

// Manual focus management if needed:
const dialogRef = useRef<HTMLDivElement>(null);
const previousFocus = useRef<HTMLElement | null>(null);

const openDialog = () => {
  previousFocus.current = document.activeElement as HTMLElement;
  setOpen(true);

  // Focus first focusable element in dialog
  setTimeout(() => {
    const firstFocusable = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    firstFocusable?.focus();
  }, 0);
};

const closeDialog = () => {
  setOpen(false);
  // Return focus to trigger element
  previousFocus.current?.focus();
};
```

### Keyboard Navigation

```typescript
// Tab order should be logical (left-to-right, top-to-bottom)
// Use tabIndex only when necessary

// Remove from tab order:
<div tabIndex={-1}>Not focusable</div>

// Add to tab order:
<div tabIndex={0} role="button">Focusable div</div>

// Custom tab order (avoid if possible):
<input tabIndex={1} />
<input tabIndex={2} />
```

---

## 6. Color Contrast Audit

**Check all color combinations:**

```bash
# Tools to use:
# - Chrome DevTools Accessibility Panel
# - WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
# - axe DevTools extension
```

**Colors to audit in globals.css:**

```css
/* MUST meet 4.5:1 for normal text, 3:1 for large text */

/* Audit these: */
--foreground on --background
--primary-foreground on --primary
--secondary-foreground on --secondary
--muted-foreground on --background (often fails - increase opacity)
--accent-foreground on --accent
--destructive-foreground on --destructive

/* Borders must be visible */
--border (ensure visible against --background)

/* Focus indicators */
--ring (must have high contrast - critical for keyboard users)
```

**Common fixes:**

```css
/* If muted-foreground fails (currently /70 opacity) */
--muted-foreground: oklch(0.55 0 0); /* Instead of current /70 */

/* Ensure borders visible */
--border: oklch(0.25 0.01 260); /* Not too subtle */

/* Focus ring high contrast */
--ring: oklch(0.7 0.2 270); /* Bright, visible */
```

---

## 7. Images & Icons

```typescript
// Decorative icons (most UI icons)
<Icon className="w-4 h-4" aria-hidden="true" />

// Meaningful icons (convey information)
<Icon className="w-4 h-4" aria-label="Error" role="img" />

// Images
<img
  src={imageSrc}
  alt="Descriptive text"
  loading="lazy"
/>

// Avatar images
<Avatar>
  <AvatarImage src={user.image} alt={`${user.name}'s avatar`} />
  <AvatarFallback>{user.name[0]}</AvatarFallback>
</Avatar>
```

---

## 8. Forms & Validation

```typescript
<form onSubmit={handleSubmit}>
  <label htmlFor="email" className="block mb-2">
    Email address
  </label>
  <input
    id="email"
    type="email"
    aria-invalid={emailError ? "true" : "false"}
    aria-describedby={emailError ? "email-error" : undefined}
    aria-required="true"
  />
  {emailError && (
    <div id="email-error" role="alert" className="text-destructive text-sm mt-1">
      {emailError}
    </div>
  )}

  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? "Submitting..." : "Submit"}
  </Button>
</form>
```

---

## Testing Checklist

### Automated Testing
- [ ] Install and run axe DevTools
- [ ] Run Lighthouse accessibility audit (score > 90)
- [ ] Check WAVE browser extension
- [ ] Validate HTML (W3C validator)

### Manual Screen Reader Testing

**macOS - VoiceOver:**
```bash
# Enable: Cmd+F5
# Navigate: Ctrl+Option+Arrow keys
# Interact: Ctrl+Option+Space
```

- [ ] Navigate through entire app with VoiceOver
- [ ] All interactive elements announced
- [ ] Form fields have labels
- [ ] Errors announced clearly
- [ ] Loading states announced
- [ ] Modal focus trap works

**Windows - NVDA:**
- [ ] Download NVDA (free)
- [ ] Test same scenarios as VoiceOver
- [ ] Verify ARIA labels read correctly

### Keyboard-Only Testing
- [ ] Tab through entire interface
- [ ] All interactive elements reachable
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Escape closes modals
- [ ] Arrow keys work in lists
- [ ] Enter activates buttons/links

### Color Contrast
- [ ] All text meets 4.5:1 (normal) or 3:1 (large)
- [ ] Borders visible
- [ ] Focus indicators high contrast
- [ ] Error states distinguishable
- [ ] Success states distinguishable
- [ ] No color-only indicators

### Focus Management
- [ ] Focus visible on all elements
- [ ] Modals trap focus
- [ ] Focus returns on modal close
- [ ] Skip link works
- [ ] No focus on hidden elements

### Semantic HTML
- [ ] Headings in correct order (h1 → h2 → h3)
- [ ] Lists use ul/ol
- [ ] Buttons use <button>
- [ ] Links use <a>
- [ ] Forms use <form>
- [ ] Landmarks used (nav, main, aside)

---

## Critical Files to Modify

**Every file needs ARIA updates:**

1. `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/(main)/layout.tsx`
   - Skip link
   - Main landmark
   - Semantic HTML

2. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatInput.tsx`
   - Form ARIA
   - Input labels
   - Error announcements

3. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatMessage.tsx`
   - Live regions
   - Article roles
   - Status announcements

4. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/MessageList.tsx`
   - role="log"
   - aria-live
   - Message focus

5. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/sidebar/app-sidebar.tsx`
   - Navigation ARIA
   - Listbox pattern
   - Button labels

6. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/CommandPalette.tsx`
   - Dialog ARIA
   - Search ARIA
   - List navigation

7. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ModelSelector.tsx`
   - Menu ARIA
   - Selected state
   - Keyboard navigation

8. `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/globals.css`
   - .sr-only utility
   - Color contrast fixes
   - Focus indicators

---

## Implementation Time

**Estimated:** 8-10 hours

**Breakdown:**
- Skip link & landmarks: 1 hour
- ARIA labels (all components): 4 hours
- Screen reader announcements: 2 hours
- Color contrast audit & fixes: 1.5 hours
- Testing with VoiceOver/NVDA: 1.5 hours

---

## Success Criteria

- [ ] WCAG AA compliant (4.5:1 contrast)
- [ ] Lighthouse accessibility score > 95
- [ ] No axe DevTools errors
- [ ] Full VoiceOver navigation works
- [ ] Full NVDA navigation works
- [ ] Keyboard-only workflow functional
- [ ] All interactive elements labeled
- [ ] Focus management correct
- [ ] Screen reader announces state changes
- [ ] Color not sole indicator of state

---

## Resources

**Testing Tools:**
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome Lighthouse (built-in)

**Documentation:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

**Screen Readers:**
- macOS: VoiceOver (built-in, Cmd+F5)
- Windows: [NVDA](https://www.nvaccess.org/download/) (free)
- Windows: JAWS (paid, industry standard)

---

## Notes

- Accessibility is NOT optional - it's a legal requirement (ADA, Section 508)
- Test with real screen readers, not just automated tools
- Involve users with disabilities in testing if possible
- Color contrast is most common failure - audit carefully
- Focus indicators must be visible - don't remove outlines
- ARIA labels don't replace semantic HTML - use both
- Test keyboard navigation frequently during development
