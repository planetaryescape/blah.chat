# Testing Philosophy

**Status:** Core Guidelines
**Last Updated:** December 2025

---

## Overview

User-centric testing approach based on Kent C. Dodds principles. Tests should give confidence that the app works for users, not that the code is structured a certain way.

**Core principle:** "The more your tests resemble the way your software is used, the more confidence they can give you."

---

## Core Principles

### 1. Test Behavior, Not Implementation

**Do:** Test what users see and do
**Don't:** Test internal state, component instances, or private methods

```typescript
// Good: Tests user behavior
await user.type(input, "Hello{Enter}");
expect(mockSendMessage).toHaveBeenCalled();

// Bad: Tests implementation details
expect(component.state.inputValue).toBe("Hello");
```

### 2. Use Accessibility Queries

Query priority (most to least preferred):

| Priority | Query | When to Use |
|----------|-------|-------------|
| 1 | `getByRole` | Most accessible, matches semantic HTML |
| 2 | `getByLabelText` | Form fields with labels |
| 3 | `getByText` | Buttons, links, text content |
| 4 | `getByTestId` | **LAST RESORT** - doesn't test like users |

```typescript
// Good: Uses accessibility queries
const input = screen.getByLabelText("Message input");
const button = screen.getByRole("button", { name: /send/i });

// Bad: Uses test IDs
const input = screen.getByTestId("chat-input");
```

### 3. Mock at Boundaries Only

**Mock:**
- Network requests (Convex hooks, API calls)
- System clock (`vi.useFakeTimers()`)
- Browser APIs (localStorage, clipboard)

**Don't Mock:**
- Child components
- Domain objects
- React hooks under test

```typescript
// Good: Mocks network boundary
vi.mock("@/lib/hooks/mutations", () => ({
  useSendMessage: () => ({ mutate: mockSendMessage, isPending: false }),
}));

// Bad: Mocks child component
vi.mock("./AttachmentPreview", () => ({ AttachmentPreview: () => null }));
```

### 4. Integration Tests > Unit Tests

The Testing Trophy (not pyramid):
1. **Static Analysis** - TypeScript, ESLint (cheapest)
2. **Integration Tests** - Sweet spot: high confidence, manageable cost
3. **Unit Tests** - Lower confidence per test
4. **E2E Tests** - Highest confidence, highest cost

Focus testing effort on integration tests that exercise real workflows.

---

## Testing Categories

| Category | Framework | Location | What to Test |
|----------|-----------|----------|--------------|
| Component | Vitest + RTL | `src/**/__tests__/*.test.tsx` | User interactions, visible outcomes |
| Convex | convex-test | `convex/__tests__/*.test.ts` | Queries, mutations, permissions |
| API Routes | Vitest | `src/app/api/**/__tests__/*.test.ts` | Endpoints, validation, envelopes |
| Utilities | Vitest | `src/lib/**/__tests__/*.test.ts` | Pure functions, edge cases |
| E2E | Playwright | `e2e/*.spec.ts` | Critical user flows |

---

## Existing Infrastructure

**DO NOT RECREATE** - Use existing test utilities:

| Asset | Location | Purpose |
|-------|----------|---------|
| `createOptimisticMessage()` | `src/lib/test/factories.ts` | Test message data |
| `createTestMessageData()` | `src/lib/test/factories.ts` | Convex message docs |
| `createTestUserData()` | `src/lib/test/factories.ts` | Convex user docs |
| `createTestConversationData()` | `src/lib/test/factories.ts` | Convex conversation docs |
| `createMockIdentity()` | `src/lib/test/factories.ts` | Clerk identity for convex-test |
| Browser mocks | `src/lib/test/setup.ts` | matchMedia, ResizeObserver |
| `createMockRequest()` | `src/lib/test/api-helpers.ts` | NextRequest for API tests |
| `assertEnvelopeSuccess()` | `src/lib/test/api-helpers.ts` | Validate API envelopes |

---

## Test Patterns

### Component Tests

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Convex/network BEFORE importing component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
}));

const mockSendMessage = vi.fn();
vi.mock("@/lib/hooks/mutations", () => ({
  useSendMessage: () => ({ mutate: mockSendMessage, isPending: false }),
}));

// Import component AFTER mocks
import { ChatInput } from "../ChatInput";

describe("ChatInput", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends message when user types and presses Enter", async () => {
    const user = userEvent.setup();
    render(<ChatInput {...requiredProps} />);

    await user.type(screen.getByLabelText("Message input"), "Hello{Enter}");

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Hello" })
    );
  });
});
```

### Convex Tests

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { createMockIdentity, createTestUserData } from "@/lib/test/factories";

describe("conversations", () => {
  it("only returns user's own conversations", async () => {
    const t = convexTest(schema);
    const identity = createMockIdentity();

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", createTestUserData({
        clerkId: identity.subject,
      }));
      await ctx.db.insert("conversations", createTestConversationData(userId));
    });

    const asUser = t.withIdentity(identity);
    const result = await asUser.query(api.conversations.list, {});

    expect(result).toHaveLength(1);
  });
});
```

### API Route Tests

```typescript
// Mocks MUST be defined BEFORE imports
vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL: { list: vi.fn(), create: vi.fn() },
}));

import { conversationsDAL } from "@/lib/api/dal/conversations";
import { createMockRequest, assertEnvelopeSuccess } from "@/lib/test/api-helpers";

describe("/api/v1/conversations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list with envelope", async () => {
    vi.mocked(conversationsDAL.list).mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET(createMockRequest("/api/v1/conversations"));
    const json = await response.json();

    assertEnvelopeSuccess(json);
  });
});
```

---

## Anti-Patterns to Avoid

### 1. Over-Mocking

```typescript
// Bad: 9 mocks = test passes while app is broken
vi.mock("./ChildA");
vi.mock("./ChildB");
vi.mock("./ChildC");
vi.mock("../hooks/useX");
vi.mock("../hooks/useY");
// ... more mocks
```

### 2. Testing Implementation Details

```typescript
// Bad: Tests internal state
expect(wrapper.find("Component").state("loading")).toBe(true);

// Bad: Tests component structure
expect(wrapper.find("Button")).toHaveLength(3);
```

### 3. Snapshot Testing for Behavior

```typescript
// Bad: Snapshot doesn't test behavior
expect(component).toMatchSnapshot();

// Good: Tests actual behavior
expect(screen.getByText("Hello")).toBeInTheDocument();
```

### 4. Testing Framework Behavior

```typescript
// Bad: Tests that React renders children
expect(container.children).toHaveLength(3);

// Good: Tests your logic
expect(screen.getByText("Item 1")).toBeInTheDocument();
```

---

## When to Write Tests

1. **Critical user flows** - Always (auth, message send, generation)
2. **Bug fixes** - Write test that fails, then fix
3. **Complex logic** - Functions with multiple branches
4. **Shared utilities** - Used across multiple components

**Skip tests for:**
- Pure styling (CSS, animations)
- Third-party library wrappers
- Simple pass-through components

---

## Related Documentation

- [Phase 1: Testing Setup](./phase-1-setup.md)
- [Phase 2: API Route Tests](./phase-2-api-routes.md)
- [Phase 3: Convex Tests](./phase-3-convex.md)
- [Phase 4: Component Tests](./phase-4-components.md)
- [Resilient Generation Manual Tests](./resilient-generation-manual.md)
