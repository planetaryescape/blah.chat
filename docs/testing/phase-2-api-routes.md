# Phase 2: API Route Integration Tests

**Priority:** P0 (Critical)
**Estimated Effort:** 3-4 hours
**Prerequisites:** Phase 1 (vitest.config.ts, src/lib/test/setup.ts, src/lib/test/factories.ts)

---

## Context

blah.chat uses a REST API layer (`/api/v1/*`) with:
- **Envelope pattern** via `formatEntity()` - all responses wrapped consistently
- **Auth middleware** via Clerk JWT (`withAuth`)
- **Error handling** via `withErrorHandling`
- **Zod validation** for request bodies

This phase tests that the API layer correctly:
1. Wraps responses in the standard envelope
2. Validates incoming requests with Zod
3. Handles auth correctly
4. Returns proper error formats

---

## What Already Exists (REUSE)

| Asset | Location | Purpose |
|-------|----------|---------|
| `formatEntity`, `formatEntityList`, `formatErrorEntity` | `src/lib/utils/formatEntity.ts` | Response formatting |
| `ApiResponse<T>` | `src/lib/api/types.ts` | Response type |
| Zod schemas | `src/app/api/v1/*/route.ts` | Validation (inline) |
| `withAuth`, `withErrorHandling` | `src/lib/api/middleware/*.ts` | Middleware |
| `conversationsDAL`, etc. | `src/lib/api/dal/*.ts` | Data access |
| `factories.ts` from Phase 1 | `src/lib/test/factories.ts` | Mock data |

---

## What This Phase Creates

```
src/app/api/v1/__tests__/
├── conversations.test.ts       # Conversation CRUD tests
├── messages.test.ts            # Message CRUD tests
├── helpers.ts                  # Shared test utilities (minimal)
docs/testing/
└── phase-2-api-routes.md       # This document
```

---

## Step-by-Step Implementation

### Step 1: Create Test Helpers (Minimal)

Only create helpers that don't already exist:

```typescript
// src/app/api/v1/__tests__/helpers.ts
//
// Minimal test helpers - reuses existing project patterns
// Does NOT recreate types or utilities that exist

import { type NextRequest } from "next/server";
import { headers } from "next/headers";

// Mock NextRequest for testing
export function createMockRequest(
  url: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, headers: customHeaders = {} } = options;

  return new Request(`http://localhost:3000${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
    ...(body && { body: JSON.stringify(body) }),
  }) as unknown as NextRequest;
}

// Validate envelope structure matches existing ApiResponse type
export function assertEnvelopeStructure(response: unknown): void {
  expect(response).toHaveProperty("status");
  expect(response).toHaveProperty("sys");
  expect((response as any).sys).toHaveProperty("entity");

  if ((response as any).status === "success") {
    expect(response).toHaveProperty("data");
  } else {
    expect(response).toHaveProperty("error");
  }
}

// Extract data from envelope (mirrors frontend pattern)
export function unwrapData<T>(response: { status: string; data?: T }): T {
  expect(response.status).toBe("success");
  return response.data as T;
}
```

### Step 2: Create Conversation API Tests

```typescript
// src/app/api/v1/__tests__/conversations.test.ts
//
// Tests for /api/v1/conversations
// Validates: envelope pattern, auth, zod validation

import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatEntity } from "@/lib/utils/formatEntity";
import type { ApiResponse } from "@/lib/api/types";
import { createMockRequest, assertEnvelopeStructure, unwrapData } from "./helpers";

// Mock DAL (don't hit real Convex in unit tests)
vi.mock("@/lib/api/dal/conversations", () => ({
  conversationsDAL: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock auth middleware to bypass Clerk
vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth: (handler: Function) => async (req: Request) => {
    return handler(req, { userId: "test-user-id" });
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { conversationsDAL } from "@/lib/api/dal/conversations";
import { GET, POST } from "../route";

describe("/api/v1/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/conversations", () => {
    it("returns list with envelope structure", async () => {
      const mockConversations = [
        { _id: "conv1", title: "Chat 1", model: "gpt-4o", _creationTime: Date.now() },
        { _id: "conv2", title: "Chat 2", model: "claude-3-opus", _creationTime: Date.now() },
      ];
      vi.mocked(conversationsDAL.list).mockResolvedValue(mockConversations);

      const req = createMockRequest("/api/v1/conversations");
      const response = await GET(req);
      const json = await response.json();

      // Validate envelope structure
      assertEnvelopeStructure(json);
      expect(json.status).toBe("success");
      expect(json.sys.entity).toBe("list");

      // Validate data
      const data = unwrapData(json);
      expect(data.items).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it("respects limit query parameter", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const req = createMockRequest("/api/v1/conversations?limit=10");
      await GET(req);

      expect(conversationsDAL.list).toHaveBeenCalledWith(
        "test-user-id",
        10,
        false
      );
    });

    it("respects archived query parameter", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const req = createMockRequest("/api/v1/conversations?archived=true");
      await GET(req);

      expect(conversationsDAL.list).toHaveBeenCalledWith(
        "test-user-id",
        50, // default limit
        true
      );
    });

    it("includes cache headers", async () => {
      vi.mocked(conversationsDAL.list).mockResolvedValue([]);

      const req = createMockRequest("/api/v1/conversations");
      const response = await GET(req);

      expect(response.headers.get("Cache-Control")).toBeTruthy();
    });
  });

  describe("POST /api/v1/conversations", () => {
    it("creates conversation with valid body", async () => {
      const mockResult = {
        _id: "new-conv",
        title: "New Chat",
        model: "gpt-4o",
        _creationTime: Date.now(),
      };
      vi.mocked(conversationsDAL.create).mockResolvedValue(
        formatEntity(mockResult, "conversation", mockResult._id)
      );

      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { model: "gpt-4o", title: "New Chat" },
      });
      const response = await POST(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      assertEnvelopeStructure(json);
    });

    it("validates required model field", async () => {
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { title: "No Model" }, // Missing required 'model'
      });

      // withErrorHandling should catch Zod error
      const response = await POST(req);
      const json = await response.json();

      expect(json.status).toBe("error");
      expect(json.sys.entity).toBe("error");
    });

    it("rejects invalid model type", async () => {
      const req = createMockRequest("/api/v1/conversations", {
        method: "POST",
        body: { model: 123 }, // Should be string
      });

      const response = await POST(req);
      const json = await response.json();

      expect(json.status).toBe("error");
    });
  });
});

describe("formatEntity", () => {
  // Unit tests for the envelope formatter itself

  it("wraps data in standard envelope", () => {
    const data = { id: "123", name: "Test" };
    const result = formatEntity(data, "user", "123");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("user");
    expect(result.sys.id).toBe("123");
    expect(result.data).toEqual(data);
  });

  it("includes timestamps when _creationTime present", () => {
    const data = { _creationTime: 1703001600000, name: "Test" };
    const result = formatEntity(data, "user");

    expect(result.sys.timestamps).toBeDefined();
    expect(result.sys.timestamps?.created).toBeTruthy();
    expect(result.sys.timestamps?.retrieved).toBeTruthy();
  });

  it("compacts data to remove undefined/null", () => {
    const data = { id: "123", name: "Test", nullField: null, undefinedField: undefined };
    const result = formatEntity(data, "user");

    // compact() should remove null/undefined
    expect(result.data).not.toHaveProperty("nullField");
    expect(result.data).not.toHaveProperty("undefinedField");
  });
});
```

### Step 3: Create Messages API Tests

```typescript
// src/app/api/v1/__tests__/messages.test.ts
//
// Tests for /api/v1/conversations/[id]/messages

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertEnvelopeStructure, unwrapData, createMockRequest } from "./helpers";

// Mock DAL
vi.mock("@/lib/api/dal/messages", () => ({
  messagesDAL: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth: (handler: Function) => async (req: Request, context: any) => {
    return handler(req, { userId: "test-user-id", ...context });
  },
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { messagesDAL } from "@/lib/api/dal/messages";

describe("/api/v1/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET messages", () => {
    it("returns messages with envelope structure", async () => {
      const mockMessages = [
        {
          _id: "msg1",
          content: "Hello",
          role: "user",
          status: "complete",
          _creationTime: Date.now(),
        },
        {
          _id: "msg2",
          content: "Hi there!",
          role: "assistant",
          status: "complete",
          model: "gpt-4o",
          _creationTime: Date.now(),
        },
      ];
      vi.mocked(messagesDAL.list).mockResolvedValue(mockMessages);

      // Import dynamically after mocks
      const { GET } = await import("../[id]/messages/route");

      const req = createMockRequest("/api/v1/conversations/conv123/messages");
      const response = await GET(req, { params: Promise.resolve({ id: "conv123" }) });
      const json = await response.json();

      assertEnvelopeStructure(json);
      expect(json.status).toBe("success");
    });

    it("filters by status parameter", async () => {
      vi.mocked(messagesDAL.list).mockResolvedValue([]);

      const { GET } = await import("../[id]/messages/route");

      const req = createMockRequest(
        "/api/v1/conversations/conv123/messages?status=generating"
      );
      await GET(req, { params: Promise.resolve({ id: "conv123" }) });

      expect(messagesDAL.list).toHaveBeenCalledWith(
        "test-user-id",
        "conv123",
        expect.objectContaining({ status: "generating" })
      );
    });
  });

  describe("Message status states", () => {
    // Validate all message status states from OptimisticMessage type
    const validStatuses = ["pending", "generating", "complete", "error"];

    it.each(validStatuses)("accepts status: %s", async (status) => {
      vi.mocked(messagesDAL.list).mockResolvedValue([
        {
          _id: "msg1",
          content: "Test",
          role: "user",
          status,
          _creationTime: Date.now(),
        },
      ]);

      const { GET } = await import("../[id]/messages/route");
      const req = createMockRequest(`/api/v1/conversations/conv123/messages?status=${status}`);
      const response = await GET(req, { params: Promise.resolve({ id: "conv123" }) });

      expect(response.status).toBe(200);
    });
  });
});
```

### Step 4: Test Error Responses

```typescript
// Add to conversations.test.ts or create separate error.test.ts

import { formatErrorEntity } from "@/lib/utils/formatEntity";

describe("formatErrorEntity", () => {
  it("formats string error", () => {
    const result = formatErrorEntity("Something went wrong");

    expect(result.status).toBe("error");
    expect(result.sys.entity).toBe("error");
    expect(result.error).toBe("Something went wrong");
  });

  it("formats Error object", () => {
    const error = new Error("Database connection failed");
    const result = formatErrorEntity(error);

    expect(result.status).toBe("error");
    expect(result.error).toBe("Database connection failed");
  });

  it("formats error object with code", () => {
    const error = { message: "Not found", code: "NOT_FOUND" };
    const result = formatErrorEntity(error);

    expect(result.status).toBe("error");
    expect(result.error).toEqual(error);
  });
});
```

### Step 5: Update package.json (if not done in Phase 1)

Ensure test command includes API tests:

```json
{
  "scripts": {
    "test": "vitest",
    "test:api": "vitest src/app/api"
  }
}
```

---

## Verification

Run API tests:

```bash
# Run all unit tests including API
bun run test

# Run only API tests
bun run test:api

# Watch mode
bun run test -- --watch src/app/api
```

### Expected Outcomes:
- All envelope structure tests pass
- Zod validation tests pass
- Mock DAL integration works
- Error responses follow envelope pattern

---

## Key Patterns Used

### 1. Mocking Strategy
- Mock DAL layer (don't hit Convex)
- Mock auth middleware (bypass Clerk)
- Mock logger (prevent console noise)

### 2. Reusing Existing Code
- `formatEntity` from `@/lib/utils/formatEntity.ts`
- `ApiResponse<T>` from `@/lib/api/types.ts`
- Zod schemas defined inline in routes

### 3. Envelope Validation
Every response must have:
```typescript
{
  status: "success" | "error",
  sys: {
    entity: string,
    id?: string,
    timestamps?: { ... }
  },
  data?: T,      // on success
  error?: string // on error
}
```

---

## What Comes Next

**Phase 3: Convex Function Unit Tests**
- Test query/mutation logic
- Mock ctx.auth for auth tests
- Use convex-test package

---

## Troubleshooting

### Import Errors with Mocks
Vitest hoists mocks. If you get import errors, ensure mocks are defined before imports:
```typescript
vi.mock("@/lib/api/dal/conversations", () => ({ ... }));
// Then import
import { conversationsDAL } from "@/lib/api/dal/conversations";
```

### Middleware Not Mocked
If auth middleware runs against real Clerk, ensure mock is loaded:
```typescript
vi.mock("@/lib/api/middleware/auth", () => ({
  withAuth: (handler: Function) => handler, // bypass
}));
```

### NextRequest vs Request
Use `createMockRequest` helper to properly type the request.
