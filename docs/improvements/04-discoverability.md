# Discoverability: Help Users Find Features

## Context

### Problem
blah.chat has powerful features (shortcuts, comparison mode, voice, images) but users don't discover them.

### Solution
1. Keyboard shortcuts reference page
2. First-time user onboarding tour
3. Comprehensive tooltips everywhere
4. Progressive hints based on usage

---

## 1. Keyboard Shortcuts Reference Page

**File:** `src/app/(main)/settings/shortcuts/page.tsx` (NEW)

```typescript
import { KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

export default function ShortcutsPage() {
  const isMac = typeof navigator !== "undefined" &&
                navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Keyboard Shortcuts</h1>
        <p className="text-muted-foreground">
          Work faster with keyboard shortcuts
        </p>
      </div>

      {/* Global Shortcuts */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Global</h2>
        <div className="grid gap-2">
          <ShortcutRow
            description="Open command palette"
            shortcut={`${mod}+K`}
          />
          <ShortcutRow
            description="New conversation"
            shortcut={`${mod}+N`}
          />
          <ShortcutRow
            description="Search conversations"
            shortcut={`${mod}+F`}
          />
          <ShortcutRow
            description="Settings"
            shortcut={`${mod}+,`}
          />
        </div>
      </section>

      {/* Navigation */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Navigation</h2>
        <div className="grid gap-2">
          <ShortcutRow
            description="Quick jump to conversation"
            shortcut={`${mod}+1-9`}
          />
          <ShortcutRow
            description="Previous conversation"
            shortcut={`${mod}+[`}
          />
          <ShortcutRow
            description="Next conversation"
            shortcut={`${mod}+]`}
          />
          <ShortcutRow
            description="Navigate list"
            shortcut="Arrow keys"
          />
        </div>
      </section>

      {/* Chat */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Chat</h2>
        <div className="grid gap-2">
          <ShortcutRow
            description="Send message"
            shortcut="Enter"
          />
          <ShortcutRow
            description="New line"
            shortcut="Shift+Enter"
          />
          <ShortcutRow
            description="Model selector"
            shortcut={`${mod}+M`}
          />
        </div>
      </section>

      {/* Message Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Message Actions</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Hover over a message first
        </p>
        <div className="grid gap-2">
          <ShortcutRow description="Regenerate" shortcut="R" />
          <ShortcutRow description="Bookmark" shortcut="B" />
          <ShortcutRow description="Copy" shortcut="C" />
          <ShortcutRow description="Delete" shortcut="Delete" />
        </div>
      </section>
    </div>
  );
}

function ShortcutRow({ description, shortcut }: { description: string; shortcut: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg border bg-background/50">
      <span className="text-sm">{description}</span>
      <kbd className="px-2 py-1 rounded border bg-muted font-mono text-sm">
        {shortcut}
      </kbd>
    </div>
  );
}
```

**Add to settings sidebar:**
```typescript
// src/app/(main)/settings/layout.tsx
<SidebarItem href="/settings/shortcuts">
  <Keyboard className="w-4 h-4" />
  Keyboard Shortcuts
</SidebarItem>
```

---

## 2. Onboarding Tour

**Install:** `bun add react-joyride`

**File:** `src/components/onboarding/OnboardingTour.tsx` (NEW)

```typescript
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useState, useEffect } from "react";

const steps: Step[] = [
  {
    target: '[data-tour="input"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Start Chatting</h3>
        <p>Type your message here. Press <kbd>Enter</kbd> to send.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Tip: Press <kbd>⌘K</kbd> anytime for shortcuts!
        </p>
      </div>
    ),
    disableBeacon: true,
    placement: "top",
  },
  {
    target: '[data-tour="model-selector"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Choose Your Model</h3>
        <p>Switch between 40+ AI models including GPT-5, Claude 4.5 Opus, and more.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Shortcut: <kbd>⌘M</kbd>
        </p>
      </div>
    ),
    placement: "top",
  },
  {
    target: '[data-tour="comparison"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Compare Responses</h3>
        <p>Get answers from multiple models side-by-side.</p>
      </div>
    ),
    placement: "top",
  },
  {
    target: '[data-tour="sidebar"]',
    content: (
      <div>
        <h3 className="font-semibold mb-2">Your Conversations</h3>
        <p>Access past chats here. Use <kbd>⌘1-9</kbd> for quick jump!</p>
      </div>
    ),
    placement: "right",
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("onboarding-tour-completed");
    if (!hasSeenTour) {
      // Start tour after brief delay
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem("onboarding-tour-completed", "true");
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      callback={handleCallback}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          zIndex: 1000,
          arrowColor: "hsl(var(--background))",
          backgroundColor: "hsl(var(--background))",
          textColor: "hsl(var(--foreground))",
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "0.375rem",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
      locale={{
        back: "Previous",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}
```

**Add to main layout:**
```typescript
// src/app/(main)/layout.tsx
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <AppSidebar />
      <main>{children}</main>
      <OnboardingTour />
    </div>
  );
}
```

**Add tour data attributes:**
```typescript
// ChatInput.tsx
<Textarea data-tour="input" ... />

// ModelSelector.tsx
<Button data-tour="model-selector" ... />

// ComparisonTrigger.tsx
<Button data-tour="comparison" ... />

// app-sidebar.tsx
<aside data-tour="sidebar" ... />
```

**Manual trigger option:**
```typescript
// Add to Help menu
<DropdownMenuItem onClick={() => {
  localStorage.removeItem("onboarding-tour-completed");
  window.location.reload();
}}>
  <Play className="w-4 h-4 mr-2" />
  Show Tour Again
</DropdownMenuItem>
```

---

## 3. Comprehensive Tooltips

**Audit all interactive elements - add tooltips:**

```typescript
// Example: ChatInput attachment button
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" disabled={!supportsVision}>
      <Paperclip className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    {supportsVision
      ? "Attach images (vision models only)"
      : "Current model doesn't support images"}
  </TooltipContent>
</Tooltip>

// Example: Voice input
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <Mic className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    Voice input <kbd>⌘V</kbd>
  </TooltipContent>
</Tooltip>

// Example: Comparison mode
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <GitCompare className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <div className="text-xs max-w-xs">
      <div className="font-semibold">Compare Models</div>
      <div className="text-muted-foreground">
        Get responses from 2-4 models side-by-side
      </div>
    </div>
  </TooltipContent>
</Tooltip>
```

**Files to audit:**
- All buttons in ChatInput
- Sidebar menu items
- Message actions
- Settings toggles
- Model selector options

---

## 4. Progressive Hints

**Show contextual hints based on usage:**

```typescript
// src/components/hints/ProgressiveHints.tsx
export function ProgressiveHints() {
  const messageCount = useQuery(api.messages.countAll);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("dismissed-hints");
    if (stored) setDismissed(JSON.parse(stored));
  }, []);

  const dismissHint = (id: string) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem("dismissed-hints", JSON.stringify(updated));
  };

  // Show memory extraction hint after 10 messages
  if (messageCount > 10 && !dismissed.includes("memory-extraction")) {
    return (
      <Banner
        variant="info"
        icon={<Sparkles className="w-4 h-4" />}
        onDismiss={() => dismissHint("memory-extraction")}
      >
        💡 Tip: Extract memories from conversations to improve future responses
      </Banner>
    );
  }

  // Show comparison mode hint after 5 conversations
  if (conversationCount > 5 && !dismissed.includes("comparison-mode")) {
    return (
      <Banner
        variant="info"
        icon={<GitCompare className="w-4 h-4" />}
        onDismiss={() => dismissHint("comparison-mode")}
      >
        💡 Try comparison mode: Get answers from multiple models at once
      </Banner>
    );
  }

  // Show keyboard shortcuts hint
  if (messageCount > 3 && !dismissed.includes("keyboard-shortcuts")) {
    return (
      <Banner
        variant="info"
        icon={<Keyboard className="w-4 h-4" />}
        onDismiss={() => dismissHint("keyboard-shortcuts")}
      >
        💡 Press <kbd>⌘K</kbd> for keyboard shortcuts
      </Banner>
    );
  }

  return null;
}
```

**Add to chat page:**
```typescript
// src/app/(main)/chat/[conversationId]/page.tsx
<div className="flex flex-col h-screen">
  <ProgressiveHints />
  <MessageList />
  <ChatInput />
</div>
```

---

## Testing Checklist

- [ ] Shortcuts page accessible via settings
- [ ] Platform detection shows correct modifiers (⌘/Ctrl)
- [ ] Onboarding tour starts on first visit
- [ ] Tour skippable and restartable
- [ ] Tour localStorage flag works
- [ ] All buttons have tooltips
- [ ] Tooltips show on hover (desktop) and focus (keyboard)
- [ ] Progressive hints appear based on usage
- [ ] Hints dismissible and don't reappear
- [ ] Mobile: no onboarding tour (or adapted version)

---

## Critical Files

1. `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/(main)/settings/shortcuts/page.tsx` (NEW)
2. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/onboarding/OnboardingTour.tsx` (NEW)
3. `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/hints/ProgressiveHints.tsx` (NEW)
4. All component files - add `data-tour` attributes and tooltips

---

## Implementation Time: 4-5 hours
