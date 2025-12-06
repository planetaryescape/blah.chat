# Keyboard Navigation: Power User Features

## Context

### Analysis from t3.chat & Industry Standards

**What Power Users Expect:**
- Arrow key navigation through lists
- Number shortcuts for quick access (⌘1-9)
- Vim-style navigation patterns
- Message-level actions via keyboard
- No mouse required for common tasks

### Current State of blah.chat

**Existing Shortcuts (Hidden):**
- ⌘K - Command palette
- ⌘N - New chat
- ⌘F - Search
- ⌘, - Settings
- ⌘B - Bookmarks
- Enter/Shift+Enter in input

**Gaps:**
- No arrow key navigation in conversation list
- Can't quick-jump to top conversations
- Command Palette shows only 5 recent (not all)
- No message-level keyboard actions
- No prev/next conversation shortcuts
- Shortcuts work but discoverability poor

### User Impact

**Current Experience:**
- Must use mouse to select conversations
- Switching between convos = scroll + click
- No keyboard-only workflow possible
- Power users frustrated by limitations

**After Implementation:**
- Full keyboard navigation
- ⌘1-9 jumps to top 9 conversations
- Arrow keys navigate sidebar
- R/B/C shortcuts on messages
- Completely mouse-free workflow

---

## Requirements

Implement 5 navigation improvements:

1. **Arrow Key Navigation** - Up/Down navigate conversation list
2. **Quick-Jump Shortcuts** - ⌘1-9 for top conversations
3. **Enhanced Command Palette** - Show all conversations, not just 5
4. **Message-Level Shortcuts** - R (regenerate), B (bookmark), C (copy), Delete
5. **Prev/Next Conversation** - ⌘[ and ⌘] navigate chronologically

---

## Technical Approach

### 1. Arrow Key Navigation in Conversation List

**Create new hook:** `src/hooks/useListKeyboardNavigation.ts`

```typescript
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface UseListKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  enabled?: boolean;
  loop?: boolean; // Wrap around at ends
}

export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  enabled = true,
  loop = false,
}: UseListKeyboardNavigationOptions<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev >= items.length - 1) {
            return loop ? 0 : prev;
          }
          return prev + 1;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev <= 0) {
            return loop ? items.length - 1 : 0;
          }
          return prev - 1;
        });
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        onSelect(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedIndex(-1);
      }
    },
    [items, selectedIndex, enabled, loop, onSelect]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.querySelector(
        `[data-conversation-index="${selectedIndex}"]`
      );
      element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    clearSelection: () => setSelectedIndex(-1),
  };
}
```

**Usage in sidebar:** `src/components/sidebar/app-sidebar.tsx`

```typescript
import { useListKeyboardNavigation } from "@/hooks/useListKeyboardNavigation";

export function AppSidebar() {
  const router = useRouter();
  const conversations = useQuery(api.conversations.list);

  const { selectedIndex, clearSelection } = useListKeyboardNavigation({
    items: conversations || [],
    onSelect: (conv) => router.push(`/chat/${conv._id}`),
    enabled: true,
    loop: true,
  });

  return (
    <Sidebar>
      {/* ... header ... */}

      <ScrollArea>
        {conversations?.map((conv, index) => (
          <ConversationItem
            key={conv._id}
            conversation={conv}
            data-conversation-index={index}
            className={cn(
              index === selectedIndex && "bg-primary/10 ring-1 ring-primary"
            )}
            onMouseEnter={clearSelection} // Clear on mouse interaction
          />
        ))}
      </ScrollArea>
    </Sidebar>
  );
}
```

---

### 2. Quick-Jump Shortcuts (⌘1-9)

**Extend:** `src/hooks/useKeyboardShortcuts.ts`

```typescript
// Add to existing useKeyboardShortcuts hook

export function useKeyboardShortcuts() {
  const router = useRouter();
  const conversations = useQuery(api.conversations.list);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // ... existing shortcuts ...

      // Quick-jump to top 9 conversations
      if (isMod && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const index = parseInt(e.key) - 1;

        if (conversations && conversations[index]) {
          router.push(`/chat/${conversations[index]._id}`);
        }
      }

      // Previous/Next conversation
      if (isMod && e.key === "[") {
        e.preventDefault();
        navigateToPreviousConversation();
      }

      if (isMod && e.key === "]") {
        e.preventDefault();
        navigateToNextConversation();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, conversations]);
}

// Helper functions
function navigateToPreviousConversation() {
  const currentId = getCurrentConversationId();
  const conversations = getConversations(); // From query
  const currentIndex = conversations.findIndex((c) => c._id === currentId);

  if (currentIndex > 0) {
    router.push(`/chat/${conversations[currentIndex - 1]._id}`);
  }
}

function navigateToNextConversation() {
  const currentId = getCurrentConversationId();
  const conversations = getConversations();
  const currentIndex = conversations.findIndex((c) => c._id === currentId);

  if (currentIndex < conversations.length - 1) {
    router.push(`/chat/${conversations[currentIndex + 1]._id}`);
  }
}
```

**Visual indicators in sidebar:**

```typescript
// Show number badges on first 9 conversations
{conversations?.slice(0, 9).map((conv, index) => (
  <ConversationItem key={conv._id} conversation={conv}>
    <div className="flex items-center justify-between w-full">
      <span className="truncate">{conv.title}</span>
      <kbd
        className="hidden sm:inline-flex h-4 px-1 text-[9px] rounded border border-border/30 bg-background/50 font-mono text-muted-foreground"
        aria-hidden="true"
      >
        ⌘{index + 1}
      </kbd>
    </div>
  </ConversationItem>
))}
```

---

### 3. Enhanced Command Palette

**File:** `src/components/CommandPalette.tsx`

**Current code** (shows only 5 recent):
```typescript
<Command.Group heading="Recent Conversations">
  {conversations?.slice(0, 5).map((conv) => (
    <Command.Item key={conv._id}>
      {conv.title}
    </Command.Item>
  ))}
</Command.Group>
```

**Enhanced with all conversations + grouping:**

```typescript
import { useMemo } from "react";

export function CommandPalette() {
  const conversations = useQuery(api.conversations.list);

  // Group conversations
  const grouped = useMemo(() => {
    if (!conversations) return { pinned: [], recent: [], archived: [] };

    return {
      pinned: conversations.filter((c) => c.pinned && !c.archived),
      recent: conversations.filter((c) => !c.pinned && !c.archived).slice(0, 20),
      archived: conversations.filter((c) => c.archived).slice(0, 10),
    };
  }, [conversations]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search conversations, commands..." />

      <CommandList>
        {/* Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => router.push("/chat/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => router.push("/search")}>
            <Search className="mr-2 h-4 w-4" />
            Search
            <CommandShortcut>⌘F</CommandShortcut>
          </CommandItem>
          {/* ... more actions ... */}
        </CommandGroup>

        {/* Pinned Conversations */}
        {grouped.pinned.length > 0 && (
          <CommandGroup heading="Pinned">
            {grouped.pinned.map((conv) => (
              <CommandItem
                key={conv._id}
                onSelect={() => router.push(`/chat/${conv._id}`)}
              >
                <Pin className="mr-2 h-4 w-4" />
                {conv.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent Conversations */}
        <CommandGroup heading="Recent Conversations">
          {grouped.recent.map((conv) => (
            <CommandItem
              key={conv._id}
              onSelect={() => router.push(`/chat/${conv._id}`)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{conv.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(conv._creationTime))} ago
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Archived */}
        {grouped.archived.length > 0 && (
          <CommandGroup heading="Archived">
            {grouped.archived.map((conv) => (
              <CommandItem
                key={conv._id}
                onSelect={() => router.push(`/chat/${conv._id}`)}
              >
                <Archive className="mr-2 h-4 w-4" />
                {conv.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

**Add virtualization for large lists:**

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

// If > 50 total conversations, virtualize
const shouldVirtualize = conversations && conversations.length > 50;

{shouldVirtualize ? (
  <VirtualizedCommandList items={grouped.recent} />
) : (
  <CommandList>{/* normal render */}</CommandList>
)}
```

---

### 4. Message-Level Shortcuts

**File:** `src/components/chat/MessageActions.tsx`

```typescript
export function MessageActions({ message }: { message: Message }) {
  const [isHovered, setIsHovered] = useState(false);
  const regenerate = useMutation(api.messages.regenerate);
  const bookmark = useMutation(api.bookmarks.toggle);
  const deleteMsg = useMutation(api.messages.delete);

  useEffect(() => {
    // Only handle shortcuts when message is hovered/focused
    if (!isHovered) return;

    const handler = (e: KeyboardEvent) => {
      // Don't interfere with typing
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleRegenerate();
      } else if (e.key === "b") {
        e.preventDefault();
        handleBookmark();
      } else if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleCopy();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isHovered, message]);

  const handleRegenerate = () => {
    regenerate({ messageId: message._id });
  };

  const handleBookmark = () => {
    bookmark({ messageId: message._id });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard");
  };

  const handleDelete = () => {
    deleteMsg({ messageId: message._id });
  };

  return (
    <div
      className="message-actions"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleRegenerate}>
            <RotateCw className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Regenerate <kbd>R</kbd>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleBookmark}>
            <Bookmark className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Bookmark <kbd>B</kbd>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Copy <kbd>C</kbd>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Delete <kbd>Del</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

**Make messages focusable:**

```typescript
// In ChatMessage.tsx
<article
  tabIndex={0}
  className={cn("message", isUser && "user-message")}
  onFocus={() => setIsFocused(true)}
  onBlur={() => setIsFocused(false)}
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {/* content */}
  {(isHovered || isFocused) && <MessageActions message={message} />}
</article>
```

---

### 5. Prev/Next Conversation Shortcuts

Already included in section 2 (⌘[ and ⌘]).

**Add visual indicators:**

```typescript
// In chat page header
<div className="flex items-center gap-1">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={navigateToPrevious}
        disabled={!hasPrevious}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      Previous conversation <kbd>⌘[</kbd>
    </TooltipContent>
  </Tooltip>

  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={navigateToNext}
        disabled={!hasNext}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      Next conversation <kbd>⌘]</kbd>
    </TooltipContent>
  </Tooltip>
</div>
```

---

## Design Specs

### Visual Feedback

**Selected conversation:**
- Background: `bg-primary/10`
- Border: `ring-1 ring-primary`
- Smooth transition: `transition-colors duration-150`

**Keyboard navigation indicators:**
- Show subtle highlight on arrow key selection
- Different from hover state (ring vs background)
- Pulse animation on Enter keypress

**Number badges:**
- Position: right side of conversation item
- Size: `h-4 px-1 text-[9px]`
- Hidden on mobile: `hidden sm:inline-flex`

### Animations

**Arrow navigation:**
```typescript
{index === selectedIndex && (
  <motion.div
    layoutId="selection"
    className="absolute inset-0 bg-primary/10 rounded-lg"
    initial={false}
    transition={{ duration: 0.2, ease: "easeOut" }}
  />
)}
```

**Number badge reveal:**
```css
@keyframes badge-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
```

---

## Accessibility Requirements

### ARIA Attributes

**Conversation list:**
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
      tabIndex={index === selectedIndex ? 0 : -1}
    >
      {conv.title}
    </div>
  ))}
</div>
```

**Message actions:**
```typescript
<article
  role="article"
  aria-label={`${message.role} message`}
  tabIndex={0}
>
  {/* content */}
</article>
```

**Keyboard shortcuts:**
- Document all in shortcuts reference page (see 04-discoverability.md)
- Add aria-keyshortcuts attribute where applicable

### Screen Reader Announcements

```typescript
// When navigating with arrows
<div role="status" aria-live="polite" className="sr-only">
  {selectedIndex >= 0 &&
    `Selected conversation ${selectedIndex + 1} of ${conversations.length}: ${conversations[selectedIndex].title}`}
</div>

// When using quick-jump
<div role="status" aria-live="assertive" className="sr-only">
  {jumpedTo && `Jumped to conversation ${jumpedTo.title}`}
</div>
```

---

## Edge Cases

### 1. No Conversations
**Problem:** Arrow keys do nothing if list empty
**Solution:** Show helpful message

```typescript
{conversations?.length === 0 && (
  <div className="p-4 text-center text-muted-foreground text-sm">
    No conversations yet. Press <kbd>⌘N</kbd> to start one.
  </div>
)}
```

### 2. Filtered List
**Problem:** Quick-jump numbers should match filtered results
**Solution:** Number visible items, not total

```typescript
const visibleConversations = conversations?.filter(matchesSearch);

{visibleConversations?.slice(0, 9).map((conv, index) => (
  <ConversationItem key={conv._id} number={index + 1} />
))}
```

### 3. Rapid Key Presses
**Problem:** Multiple arrow presses may skip items
**Solution:** Debounce selection updates

```typescript
const [selectedIndex, setSelectedIndex] = useState(-1);
const timeoutRef = useRef<NodeJS.Timeout>();

const handleArrowKey = (direction: "up" | "down") => {
  clearTimeout(timeoutRef.current);

  setSelectedIndex((prev) => {
    const next = direction === "down" ? prev + 1 : prev - 1;
    const bounded = Math.max(0, Math.min(items.length - 1, next));

    // Scroll into view after brief delay
    timeoutRef.current = setTimeout(() => {
      scrollToIndex(bounded);
    }, 50);

    return bounded;
  });
};
```

### 4. Mouse vs Keyboard
**Problem:** Selection conflicts with hover state
**Solution:** Clear keyboard selection on mouse interaction

```typescript
<ConversationItem
  onMouseEnter={() => {
    clearSelection(); // Clear keyboard selection
  }}
  className={cn(
    index === selectedIndex && "keyboard-selected",
    isHovered && "mouse-hovered"
  )}
/>
```

### 5. Long Conversation Lists
**Problem:** Scrolling with arrows is slow
**Solution:** Add Page Up/Down shortcuts

```typescript
if (e.key === "PageDown") {
  e.preventDefault();
  setSelectedIndex((prev) => Math.min(prev + 10, items.length - 1));
} else if (e.key === "PageUp") {
  e.preventDefault();
  setSelectedIndex((prev) => Math.max(prev - 10, 0));
}
```

---

## Testing Checklist

### Arrow Key Navigation
- [ ] Up/Down arrows navigate conversation list
- [ ] Enter opens selected conversation
- [ ] Escape clears selection
- [ ] Page Up/Down jumps by 10
- [ ] Home/End go to first/last
- [ ] Loop option works (wrap at ends)
- [ ] Doesn't interfere with input/textarea typing
- [ ] Selection scrolls into view

### Quick-Jump Shortcuts
- [ ] ⌘1-9 jumps to correct conversation
- [ ] Works with filtered list (matches visible items)
- [ ] Shows number badges on first 9
- [ ] Badges hidden on mobile
- [ ] No error if < 9 conversations
- [ ] macOS shows ⌘, Windows shows Ctrl

### Command Palette
- [ ] Shows all conversations (not just 5)
- [ ] Groups: Pinned, Recent, Archived
- [ ] Search filters across all groups
- [ ] Arrow keys navigate grouped list
- [ ] Enter opens selected conversation
- [ ] Virtualizes for large lists (>50)

### Message Shortcuts
- [ ] R regenerates message (AI messages only)
- [ ] B bookmarks message
- [ ] C copies message content
- [ ] Delete removes message (with confirmation)
- [ ] Shortcuts only active when message hovered/focused
- [ ] Tooltips show shortcut hints
- [ ] Doesn't conflict with typing in input

### Prev/Next Conversation
- [ ] ⌘[ goes to previous conversation
- [ ] ⌘] goes to next conversation
- [ ] Buttons disabled at list ends
- [ ] Tooltips show shortcuts
- [ ] Works chronologically (by creation time)

### Accessibility
- [ ] Screen reader announces selections
- [ ] role="listbox" and role="option" used
- [ ] aria-selected reflects state
- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Keyboard shortcuts documented

### Cross-browser
- [ ] Chrome - all shortcuts work
- [ ] Firefox - arrow keys don't conflict with browser
- [ ] Safari - keyboard events captured correctly
- [ ] Mobile - shortcuts hidden/disabled appropriately

---

## Critical Files to Modify

1. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/hooks/useListKeyboardNavigation.ts`** (NEW)
   - Arrow key navigation hook
   - Selection state management
   - Scroll into view logic

2. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/hooks/useKeyboardShortcuts.ts`**
   - Add ⌘1-9 quick-jump shortcuts
   - Add ⌘[ and ⌘] for prev/next
   - Extract conversation navigation logic

3. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/sidebar/app-sidebar.tsx`**
   - Integrate useListKeyboardNavigation hook
   - Add number badges to first 9 conversations
   - Add selection styling

4. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/CommandPalette.tsx`**
   - Remove slice(0, 5) limit
   - Add grouping (Pinned, Recent, Archived)
   - Add virtualization for large lists

5. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/MessageActions.tsx`**
   - Add keyboard shortcuts (R, B, C, Delete)
   - Add hover/focus state tracking
   - Update tooltips to show shortcuts

6. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatMessage.tsx`**
   - Make messages focusable (tabIndex={0})
   - Add focus/hover state management
   - Show actions on keyboard focus

7. **`/Users/bhekanik/code/planetaryescape/blah.chat/src/app/(main)/chat/[conversationId]/page.tsx`**
   - Add prev/next navigation buttons
   - Integrate ⌘[ and ⌘] shortcuts

---

## Code Examples

### Complete useListKeyboardNavigation Hook

```typescript
// src/hooks/useListKeyboardNavigation.ts

import { useEffect, useState, useCallback, useRef } from "react";

export interface UseListKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  enabled?: boolean;
  loop?: boolean;
  scrollIntoView?: boolean;
}

export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  enabled = true,
  loop = false,
  scrollIntoView = true,
}: UseListKeyboardNavigationOptions<T>) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const clearSelection = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Don't interfere with typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      let newIndex = selectedIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          newIndex = selectedIndex >= items.length - 1
            ? (loop ? 0 : selectedIndex)
            : selectedIndex + 1;
          break;

        case "ArrowUp":
          e.preventDefault();
          newIndex = selectedIndex <= 0
            ? (loop ? items.length - 1 : 0)
            : selectedIndex - 1;
          break;

        case "PageDown":
          e.preventDefault();
          newIndex = Math.min(selectedIndex + 10, items.length - 1);
          break;

        case "PageUp":
          e.preventDefault();
          newIndex = Math.max(selectedIndex - 10, 0);
          break;

        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;

        case "End":
          e.preventDefault();
          newIndex = items.length - 1;
          break;

        case "Enter":
          if (selectedIndex >= 0) {
            e.preventDefault();
            onSelect(items[selectedIndex]);
          }
          return;

        case "Escape":
          e.preventDefault();
          clearSelection();
          return;

        default:
          return;
      }

      setSelectedIndex(newIndex);

      // Scroll into view with debounce
      if (scrollIntoView) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          const element = document.querySelector(
            `[data-list-index="${newIndex}"]`
          );
          element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }, 50);
      }
    },
    [items, selectedIndex, enabled, loop, onSelect, clearSelection, scrollIntoView]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [handleKeyDown, enabled]);

  return {
    selectedIndex,
    setSelectedIndex,
    clearSelection,
  };
}
```

---

## Success Metrics

**Before:**
- 100% mouse-dependent navigation
- Switching conversations = scroll + click
- No keyboard workflow possible

**After:**
- Full keyboard navigation support
- ⌘1-9 instant access to top conversations
- Arrow keys for fluid navigation
- Message actions accessible via keyboard
- Power users can work completely mouse-free

---

## Implementation Time

**Estimated:** 5-6 hours

**Breakdown:**
- useListKeyboardNavigation hook: 90 min
- Quick-jump shortcuts (⌘1-9): 60 min
- Enhanced Command Palette: 90 min
- Message-level shortcuts: 90 min
- Prev/Next navigation: 45 min
- Testing & polish: 60 min

---

## Dependencies

- Command component (exists: cmdk library)
- TanStack Virtual (for large lists in Command Palette)
- Framer Motion (for selection animations)

**Install if needed:**
```bash
bun add @tanstack/react-virtual
```

---

## Related Improvements

- **01-quick-wins.md** - Shortcut badges complement this
- **04-discoverability.md** - Shortcuts reference page will document these
- **07-accessibility.md** - ARIA requirements coordinated here

---

## Notes

- Selection state cleared on mouse interaction (prevents conflicts)
- Shortcuts respect input focus (don't interfere with typing)
- Number badges adapt to filtered lists (always show visible index)
- Prev/Next navigation chronological, not based on sidebar order
- Command Palette virtualized only for >50 conversations (performance)
- All shortcuts work cross-platform (⌘ on Mac, Ctrl on Windows)
