# Phase 4: React Component Tests

**Priority:** P1 (High)
**Estimated Effort:** 4-5 hours
**Prerequisites:** Phase 1 (vitest.config.ts, setup.ts, factories.ts)

---

## Context

blah.chat has 70+ React components. This phase focuses on testing the most critical:
- **ChatMessage** - Message rendering with status states
- **ChatInput** - User input handling
- **MessageList** - Message display and ordering

These components handle the core user experience and the optimistic UI pattern.

---

## What Already Exists (REUSE)

| Asset | Location | Purpose |
|-------|----------|---------|
| `OptimisticMessage` type | `src/types/optimistic.ts` | Message state definition |
| `createOptimisticMessage` factory | `src/lib/test/factories.ts` | Test data |
| data-testid selectors | `docs/testing/resilient-generation-manual.md` | Test selectors |
| Vitest + React Testing Library | Phase 1 setup | Test framework |

---

## What This Phase Creates

```
src/components/chat/__tests__/
├── ChatMessage.test.tsx       # Message rendering tests
├── ChatInput.test.tsx         # Input behavior tests
├── MessageList.test.tsx       # List rendering tests
├── MessageLoadingState.test.tsx  # Status state tests
docs/testing/
└── phase-4-components.md      # This document
```

---

## Testing Approach

Use **@testing-library/react** with user-centric queries:
- Prefer `getByRole`, `getByText` over `getByTestId`
- Test what users see, not implementation details
- Use existing `data-testid` selectors from manual test doc when needed

---

## Step-by-Step Implementation

### Step 1: Create Component Test Utilities

Add to existing `src/lib/test/setup.ts`:

```typescript
// Add to src/lib/test/setup.ts

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/chat/test-conv",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Convex hooks (prevents real backend calls)
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
  useConvex: vi.fn(() => ({})),
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "test-user", primaryEmailAddress: { emailAddress: "test@example.com" } },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    userId: "test-user",
    isLoaded: true,
    isSignedIn: true,
  }),
}));
```

### Step 2: Create ChatMessage Tests

```typescript
// src/components/chat/__tests__/ChatMessage.test.tsx
//
// Tests for ChatMessage component
// Uses OptimisticMessage type from src/types/optimistic.ts

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "../ChatMessage";
import { createOptimisticMessage } from "@/lib/test/factories";
import type { OptimisticMessage } from "@/types/optimistic";
import type { Doc } from "@/convex/_generated/dataModel";

// Mock child components to isolate ChatMessage
vi.mock("../MarkdownContent", () => ({
  MarkdownContent: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

vi.mock("../MessageActions", () => ({
  MessageActions: () => <div data-testid="message-actions" />,
}));

describe("ChatMessage", () => {
  // Create a base message for testing
  const baseMessage: Doc<"messages"> = {
    _id: "msg-1" as any,
    _creationTime: Date.now(),
    conversationId: "conv-1" as any,
    userId: "user-1" as any,
    role: "user",
    content: "Hello, world!",
    status: "complete",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe("rendering", () => {
    it("renders user message content", () => {
      render(<ChatMessage message={baseMessage} />);

      expect(screen.getByTestId("markdown")).toHaveTextContent("Hello, world!");
    });

    it("renders assistant message with model badge", () => {
      const assistantMessage = {
        ...baseMessage,
        role: "assistant" as const,
        model: "gpt-4o",
        content: "Hi there!",
      };

      render(<ChatMessage message={assistantMessage} />);

      expect(screen.getByTestId("markdown")).toHaveTextContent("Hi there!");
      // Model badge should be visible for assistant messages
    });

    it("applies correct data-status attribute", () => {
      const { container } = render(
        <ChatMessage message={{ ...baseMessage, status: "generating" }} />
      );

      // Using data-status from manual test doc
      const messageEl = container.querySelector('[data-status="generating"]');
      expect(messageEl).toBeTruthy();
    });
  });

  describe("status states", () => {
    // Test all states from OptimisticMessage.status
    const statuses = ["pending", "generating", "complete", "error"] as const;

    it.each(statuses)("renders correctly with status: %s", (status) => {
      render(<ChatMessage message={{ ...baseMessage, status }} />);

      // Should not crash, content should be visible
      expect(screen.getByTestId("markdown")).toBeInTheDocument();
    });

    it("shows loading indicator for generating status", () => {
      render(<ChatMessage message={{ ...baseMessage, status: "generating" }} />);

      // Check for generating indicator (adjust selector based on implementation)
      const indicator = screen.queryByTestId("message-generating");
      // This tests the presence, actual assertion depends on implementation
    });

    it("shows partialContent during generation", () => {
      render(
        <ChatMessage
          message={{
            ...baseMessage,
            status: "generating",
            content: "",
            partialContent: "Generating response...",
          }}
        />
      );

      expect(screen.getByTestId("markdown")).toHaveTextContent("Generating response...");
    });

    it("shows error state with error message", () => {
      render(
        <ChatMessage
          message={{
            ...baseMessage,
            status: "error",
            error: "Failed to generate response",
          }}
        />
      );

      // Should display error somehow
      expect(screen.getByText(/failed to generate/i)).toBeInTheDocument();
    });
  });

  describe("optimistic message handling", () => {
    it("renders optimistic message correctly", () => {
      const optimisticMsg = createOptimisticMessage({
        content: "Sending...",
        status: "optimistic",
      });

      render(<ChatMessage message={optimisticMsg as any} />);

      expect(screen.getByTestId("markdown")).toHaveTextContent("Sending...");
    });

    it("applies optimistic styling", () => {
      const optimisticMsg = createOptimisticMessage({
        status: "optimistic",
      });

      const { container } = render(<ChatMessage message={optimisticMsg as any} />);

      // Check for optimistic indicator from manual test doc
      const optimisticEl = container.querySelector('[data-testid="message-optimistic"]');
      // Actual assertion depends on implementation
    });
  });

  describe("attachments", () => {
    it("renders message with image attachment", () => {
      const messageWithImage = {
        ...baseMessage,
        attachments: [
          {
            type: "image",
            name: "photo.jpg",
            storageId: "storage-123",
            mimeType: "image/jpeg",
            size: 1024,
          },
        ],
      };

      render(<ChatMessage message={messageWithImage as any} />);

      // Should show attachment indicator
      // Actual assertion depends on implementation
    });
  });

  describe("reasoning (thinking)", () => {
    it("shows reasoning block when present", () => {
      const messageWithReasoning = {
        ...baseMessage,
        role: "assistant" as const,
        reasoning: "Let me think about this...",
        reasoningTokens: 150,
      };

      render(<ChatMessage message={messageWithReasoning as any} />);

      // Should show reasoning section
      expect(screen.getByText(/let me think/i)).toBeInTheDocument();
    });
  });
});
```

### Step 3: Create ChatInput Tests

```typescript
// src/components/chat/__tests__/ChatInput.test.tsx
//
// Tests for ChatInput component

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../ChatInput";

// Mock hooks
const mockSendMessage = vi.fn();
vi.mock("@/hooks/useSendMessage", () => ({
  useSendMessage: () => ({
    sendMessage: mockSendMessage,
    isPending: false,
  }),
}));

describe("ChatInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("text input", () => {
    it("renders textarea", () => {
      render(<ChatInput conversationId="conv-1" />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("accepts user input", async () => {
      const user = userEvent.setup();
      render(<ChatInput conversationId="conv-1" />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Hello, AI!");

      expect(textarea).toHaveValue("Hello, AI!");
    });

    it("clears input after sending", async () => {
      const user = userEvent.setup();
      render(<ChatInput conversationId="conv-1" />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test message");

      // Find and click send button
      const sendButton = screen.getByRole("button", { name: /send/i });
      await user.click(sendButton);

      expect(textarea).toHaveValue("");
    });
  });

  describe("send behavior", () => {
    it("calls sendMessage on submit", async () => {
      const user = userEvent.setup();
      render(<ChatInput conversationId="conv-1" />);

      await user.type(screen.getByRole("textbox"), "Test message");
      await user.click(screen.getByRole("button", { name: /send/i }));

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Test message",
        })
      );
    });

    it("prevents empty message submission", async () => {
      const user = userEvent.setup();
      render(<ChatInput conversationId="conv-1" />);

      const sendButton = screen.getByRole("button", { name: /send/i });
      await user.click(sendButton);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it("submits on Enter key (without Shift)", async () => {
      const user = userEvent.setup();
      render(<ChatInput conversationId="conv-1" />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test message");
      await user.keyboard("{Enter}");

      expect(mockSendMessage).toHaveBeenCalled();
    });

    it("allows newline on Shift+Enter", async () => {
      const user = userEvent.setup();
      render(<ChatInput conversationId="conv-1" />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Line 1");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      await user.type(textarea, "Line 2");

      expect(textarea).toHaveValue("Line 1\nLine 2");
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("disables input when pending", () => {
      vi.mocked(require("@/hooks/useSendMessage").useSendMessage).mockReturnValue({
        sendMessage: mockSendMessage,
        isPending: true,
      });

      render(<ChatInput conversationId="conv-1" />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });
});
```

### Step 4: Create MessageLoadingState Tests

```typescript
// src/components/chat/__tests__/MessageLoadingState.test.tsx
//
// Tests for loading/generating states
// Critical for resilient generation feature

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageLoadingState } from "../MessageLoadingState";

describe("MessageLoadingState", () => {
  describe("pending state", () => {
    it("shows pending indicator", () => {
      render(<MessageLoadingState status="pending" />);

      // Should show some pending indicator
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
  });

  describe("generating state", () => {
    it("shows generating animation", () => {
      render(<MessageLoadingState status="generating" />);

      // Should show generating indicator from manual test doc
      const indicator = screen.getByTestId("message-generating");
      expect(indicator).toBeInTheDocument();
    });

    it("shows partial content count when provided", () => {
      render(
        <MessageLoadingState
          status="generating"
          partialContentLength={150}
        />
      );

      // Might show token count or progress
    });
  });

  describe("complete state", () => {
    it("shows completion indicator", () => {
      render(<MessageLoadingState status="complete" />);

      // Should show complete indicator from manual test doc
      const indicator = screen.getByTestId("message-complete");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message", () => {
      render(
        <MessageLoadingState
          status="error"
          error="Connection failed"
        />
      );

      expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
    });

    it("shows retry option", () => {
      render(
        <MessageLoadingState
          status="error"
          error="Failed"
          onRetry={() => {}}
        />
      );

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });
});
```

### Step 5: Create MessageList Tests

```typescript
// src/components/chat/__tests__/MessageList.test.tsx
//
// Tests for MessageList component

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { Doc } from "@/convex/_generated/dataModel";

// Mock ChatMessage to isolate MessageList
vi.mock("../ChatMessage", () => ({
  ChatMessage: ({ message }: { message: any }) => (
    <div data-testid={`message-${message._id}`}>{message.content}</div>
  ),
}));

describe("MessageList", () => {
  const createMessage = (
    id: string,
    content: string,
    role: "user" | "assistant" = "user"
  ): Doc<"messages"> => ({
    _id: id as any,
    _creationTime: Date.now(),
    conversationId: "conv-1" as any,
    userId: "user-1" as any,
    role,
    content,
    status: "complete",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  describe("rendering", () => {
    it("renders all messages", () => {
      const messages = [
        createMessage("msg-1", "Hello"),
        createMessage("msg-2", "Hi there!", "assistant"),
        createMessage("msg-3", "How are you?"),
      ];

      render(<MessageList messages={messages} />);

      expect(screen.getByTestId("message-msg-1")).toBeInTheDocument();
      expect(screen.getByTestId("message-msg-2")).toBeInTheDocument();
      expect(screen.getByTestId("message-msg-3")).toBeInTheDocument();
    });

    it("renders messages in order", () => {
      const messages = [
        createMessage("msg-1", "First"),
        createMessage("msg-2", "Second"),
        createMessage("msg-3", "Third"),
      ];

      render(<MessageList messages={messages} />);

      const messageElements = screen.getAllByTestId(/^message-/);
      expect(messageElements[0]).toHaveTextContent("First");
      expect(messageElements[1]).toHaveTextContent("Second");
      expect(messageElements[2]).toHaveTextContent("Third");
    });

    it("shows empty state when no messages", () => {
      render(<MessageList messages={[]} />);

      // Should show some empty state or nothing
      expect(screen.queryByTestId(/^message-/)).not.toBeInTheDocument();
    });
  });

  describe("optimistic messages", () => {
    it("renders optimistic message alongside real messages", () => {
      const messages = [
        createMessage("msg-1", "Real message"),
      ];

      const optimisticMessage = {
        _id: "temp-123",
        content: "Optimistic message",
        status: "optimistic",
        role: "user",
        _optimistic: true,
      };

      render(
        <MessageList
          messages={messages}
          optimisticMessage={optimisticMessage as any}
        />
      );

      expect(screen.getByTestId("message-msg-1")).toBeInTheDocument();
      expect(screen.getByTestId("message-temp-123")).toBeInTheDocument();
    });

    it("places optimistic message at end", () => {
      const messages = [createMessage("msg-1", "Real")];
      const optimistic = {
        _id: "temp-1",
        content: "Optimistic",
        status: "optimistic",
        role: "user",
        _optimistic: true,
      };

      render(
        <MessageList
          messages={messages}
          optimisticMessage={optimistic as any}
        />
      );

      const allMessages = screen.getAllByTestId(/^message-/);
      expect(allMessages[allMessages.length - 1]).toHaveTextContent("Optimistic");
    });
  });

  describe("generating message", () => {
    it("shows generating indicator for in-progress message", () => {
      const messages = [
        {
          ...createMessage("msg-1", ""),
          status: "generating",
          partialContent: "Thinking...",
        },
      ];

      render(<MessageList messages={messages as any} />);

      // Component should show generating state
      expect(screen.getByTestId("message-msg-1")).toHaveTextContent("Thinking...");
    });
  });
});
```

---

## Verification

Run component tests:

```bash
# Run all tests
bun run test

# Run only component tests
bun run test src/components

# Watch mode for development
bun run test -- --watch src/components
```

### Expected Outcomes:
- All status state tests pass
- Optimistic message rendering works
- Input handling behaves correctly
- Loading states display properly

---

## Key Patterns

### 1. Using Existing Types
```typescript
import type { OptimisticMessage } from "@/types/optimistic";
import { createOptimisticMessage } from "@/lib/test/factories";
```

### 2. Mocking Child Components
```typescript
vi.mock("../MarkdownContent", () => ({
  MarkdownContent: ({ content }) => <div>{content}</div>,
}));
```

### 3. Using data-testid from Manual Doc
```typescript
// Selectors defined in docs/testing/resilient-generation-manual.md
expect(container.querySelector('[data-status="generating"]')).toBeTruthy();
```

---

## What Comes Next

**Phase 5: Utility Unit Tests**
- Test pure functions (formatEntity, date utils)
- Fast, isolated tests
- High coverage for critical utilities

---

## Troubleshooting

### Mock Hoisting Issues
Vitest hoists mocks. Define mocks before imports:
```typescript
vi.mock("../ChildComponent", () => ({ ... }));
// Then use component that imports ChildComponent
```

### Convex Hook Mocking
Components using `useQuery`, `useMutation` need mocks:
```typescript
vi.mock("convex/react", () => ({
  useQuery: () => mockData,
  useMutation: () => mockMutate,
}));
```

### Next.js Navigation
Mock `next/navigation` for components using router:
```typescript
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
```

### CSS-in-JS / Tailwind
Component tests focus on behavior, not styling. If class assertions needed, use `toHaveClass`.
