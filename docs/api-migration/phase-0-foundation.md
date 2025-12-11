# Phase 0: Foundation & Infrastructure

## Overview

Establish core API infrastructure: routing, utilities, authentication, error handling, logging. Create patterns used by all subsequent phases.

## Context & Grand Scope

### Why This Phase Exists
Native mobile apps can't use Convex client SDK. Need REST/GraphQL API with standard HTTP semantics. Phase 0 creates foundation - every subsequent phase builds on these patterns.

### Dependencies
- **Previous phases**: None (first phase)
- **Blocks**: Phases 1-7 (all require foundation)
- **Critical path**: Must complete before any API routes work

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. API Envelope Pattern**
- Used by: Stripe, GitHub, Slack, Twilio
- Rationale: Consistent structure simplifies parsing, error handling, logging
- blah.chat already uses this - see `docs/ENVELOPE_PATTERN_IMPLEMENTATION.md`

**2. Directory Structure**
- `/api/v1/` - Version namespace (future v2 won't break clients)
- `/api/v1/[resource]/` - REST resource grouping
- `/api/v1/[resource]/[id]/` - Specific resource operations

**3. Authentication Strategy**
- Clerk JWT validation (already in use)
- Extract userId from session
- Reuse existing `getUserFromAuth` pattern

**4. Logging Strategy**
- Structured JSON logs via Pino (already configured)
- Request/response logging middleware
- Error correlation via request IDs

### Decisions Made

**Decision 1: Keep Envelope Format**
- Already implemented: `src/lib/utils/formatEntity.ts`
- No breaking changes
- Just need HTTP wrapper

**Decision 2: Data Access Layer (DAL)**
- Thin wrapper over Convex queries/mutations
- Enables gradual migration
- Server-only code (not exposed to client)

**Decision 3: Next.js Route Handlers**
- Native Next.js 15 App Router
- No Express/Fastify needed
- Serverless-friendly

**Decision 4: TypeScript-first**
- Zod for runtime validation
- Type-safe end-to-end
- Generate OpenAPI from Zod schemas (future)

## Current State Analysis

### How blah.chat Works Today

**1. Client → Convex Direct**
```typescript
// src/components/chat/ChatInput.tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const sendMessage = useMutation(api.chat.send);
await sendMessage({ conversationId, content });
```

**2. Envelope Format Exists**
```typescript
// src/lib/utils/formatEntity.ts (already implemented)
export function formatEntity<T>(
  data: T,
  entityType: string,
  id?: string,
): ApiResponse<T> {
  return {
    status: "success",
    sys: {
      entity: entityType,
      id,
      timestamps: {
        retrieved: new Date().toISOString(),
      },
    },
    data,
  };
}
```

**3. Logging Infrastructure**
```typescript
// src/lib/logger.ts (already configured)
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

**4. Auth Pattern**
```typescript
// Scattered across API routes, needs centralization
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ...
}
```

### Specific Files/Patterns

**Existing Infrastructure** (paths from `/Users/bhekanik/code/planetaryescape/blah.chat/`):
- `src/lib/utils/formatEntity.ts` - Envelope utilities ✅
- `src/lib/logger.ts` - Pino logger ✅
- `src/app/api/` - Some routes exist, inconsistent patterns ⚠️
- Authentication - Scattered, needs centralization ⚠️

**Missing Infrastructure**:
- ❌ Centralized auth middleware
- ❌ Data Access Layer (DAL)
- ❌ Request/response logging middleware
- ❌ Standardized error handling
- ❌ API versioning structure (`/api/v1/`)

## Target State

### What We're Building

```
src/
├── lib/
│   ├── api/
│   │   ├── dal/              # Data Access Layer
│   │   │   ├── index.ts      # Public exports
│   │   │   ├── conversations.ts
│   │   │   ├── messages.ts
│   │   │   ├── users.ts
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.ts       # Clerk JWT validation
│   │   │   ├── logger.ts     # Request/response logging
│   │   │   └── errors.ts     # Error handling
│   │   ├── types.ts          # Shared API types
│   │   └── utils.ts          # API utilities
│   └── utils/
│       └── formatEntity.ts   # Already exists ✅
├── app/
│   └── api/
│       └── v1/               # Version 1 API
│           ├── health/
│           │   └── route.ts  # Health check endpoint
│           ├── conversations/
│           │   └── route.ts  # Coming in Phase 1
│           └── messages/
│               └── route.ts  # Coming in Phase 1
```

### Success Looks Like

1. **GET /api/v1/health** returns:
```json
{
  "status": "success",
  "sys": {
    "entity": "health",
    "timestamps": {
      "retrieved": "2025-12-10T12:00:00.000Z"
    }
  },
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2025-12-10T12:00:00.000Z"
  }
}
```

2. **All requests logged**:
```json
{
  "level": "info",
  "method": "GET",
  "url": "/api/v1/health",
  "userId": "user_abc123",
  "duration": 45,
  "status": 200
}
```

3. **Auth middleware reusable**:
```typescript
import { withAuth } from "@/lib/api/middleware/auth";

export const GET = withAuth(async (req, { userId }) => {
  // userId guaranteed present
});
```

4. **DAL testable in isolation**:
```typescript
import { conversationsDAL } from "@/lib/api/dal";

const conversations = await conversationsDAL.list(userId);
```

## Implementation Steps

### Step 1: Create API Types

**Goal**: Type-safe API contracts

**Action**: Define core types used across all API routes

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/types.ts`

**Code**:
```typescript
// src/lib/api/types.ts
import type { NextRequest } from "next/server";

/**
 * API Response envelope (matches existing formatEntity output)
 */
export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  sys: {
    entity: string;
    id?: string;
    timestamps?: {
      retrieved: string;
      created?: string;
      updated?: string;
    };
  };
  data?: T;
  error?: string | {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}

/**
 * Authenticated route handler context
 */
export interface AuthContext {
  userId: string;
  sessionId: string;
}

/**
 * Route handler with auth
 */
export type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthContext & { params?: Record<string, string> }
) => Promise<Response>;

/**
 * Common error codes
 */
export enum ApiErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

### Step 2: Create Auth Middleware

**Goal**: Centralize Clerk authentication, extract userId

**Action**: Create reusable auth wrapper for route handlers

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/middleware/auth.ts`

**Code**:
```typescript
// src/lib/api/middleware/auth.ts
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { formatErrorEntity } from "@/lib/utils/formatEntity";
import { logger } from "@/lib/logger";
import type { AuthenticatedHandler, ApiErrorCode } from "../types";
import { ApiError } from "../types";

/**
 * Wraps route handler with Clerk authentication
 * Extracts userId and sessionId, passes to handler
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string> }
  ) => {
    const startTime = Date.now();
    const method = req.method;
    const url = req.url;

    try {
      // Get auth from Clerk
      const { userId, sessionId } = await auth();

      if (!userId) {
        logger.warn({
          method,
          url,
          message: "Unauthorized request - no userId",
        });

        return NextResponse.json(
          formatErrorEntity({
            message: "Authentication required",
            code: "UNAUTHORIZED" as ApiErrorCode,
          }),
          { status: 401 }
        );
      }

      logger.debug({
        method,
        url,
        userId,
        message: "Authenticated request",
      });

      // Call handler with auth context
      const response = await handler(req, {
        userId,
        sessionId: sessionId || "",
        params: context?.params,
      });

      // Log successful request
      const duration = Date.now() - startTime;
      logger.info({
        method,
        url,
        userId,
        status: response.status,
        duration,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle known API errors
      if (error instanceof ApiError) {
        logger.error({
          method,
          url,
          error: error.message,
          code: error.code,
          status: error.statusCode,
          duration,
        });

        return NextResponse.json(
          formatErrorEntity({
            message: error.message,
            code: error.code,
            details: error.details,
          }),
          { status: error.statusCode }
        );
      }

      // Handle unknown errors
      logger.error({
        method,
        url,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      return NextResponse.json(
        formatErrorEntity({
          message: "Internal server error",
          code: "INTERNAL_ERROR" as ApiErrorCode,
        }),
        { status: 500 }
      );
    }
  };
}

/**
 * Optional auth - doesn't fail if not authenticated
 * Useful for public endpoints that behave differently when authenticated
 */
export function withOptionalAuth(
  handler: (
    req: NextRequest,
    context: Partial<{ userId: string; sessionId: string }> & {
      params?: Record<string, string>;
    }
  ) => Promise<Response>
) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string> }
  ) => {
    try {
      const { userId, sessionId } = await auth();

      return handler(req, {
        userId: userId || undefined,
        sessionId: sessionId || undefined,
        params: context?.params,
      });
    } catch (error) {
      logger.error({
        method: req.method,
        url: req.url,
        error: error instanceof Error ? error.message : "Auth check failed",
      });

      // Continue without auth
      return handler(req, { params: context?.params });
    }
  };
}
```

### Step 3: Create Data Access Layer (DAL) Foundation

**Goal**: Centralize Convex access, enable testing

**Action**: Create DAL utilities and first example (users)

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/index.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/dal/users.ts`

**Code**:
```typescript
// src/lib/api/dal/index.ts
/**
 * Data Access Layer (DAL)
 *
 * Thin wrapper over Convex queries/mutations.
 * Benefits:
 * - Centralized data access patterns
 * - Testable in isolation (mock Convex)
 * - Gradual migration (add DAL methods as needed)
 * - Type-safe (leverages Convex types)
 */

export * from "./users";
// Export other DAL modules as they're created in future phases
```

```typescript
// src/lib/api/dal/users.ts
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * User data access layer
 */
export const usersDAL = {
  /**
   * Get user by Clerk ID
   */
  async getByClerkId(clerkId: string) {
    return fetchQuery(api.users.getByClerkId, { clerkId });
  },

  /**
   * Get user by Convex ID
   */
  async getById(id: Id<"users">) {
    return fetchQuery(api.users.getById, { id });
  },

  /**
   * Get current user (from auth context)
   */
  async getCurrent(clerkId: string) {
    return fetchQuery(api.users.getByClerkId, { clerkId });
  },
};

// Type exports for consumers
export type User = Awaited<ReturnType<typeof usersDAL.getById>>;
```

### Step 4: Create Error Handler Middleware

**Goal**: Consistent error responses

**Action**: Centralize error handling logic

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/middleware/errors.ts`

**Code**:
```typescript
// src/lib/api/middleware/errors.ts
import { NextResponse } from "next/server";
import { formatErrorEntity } from "@/lib/utils/formatEntity";
import { logger } from "@/lib/logger";
import { ApiError, ApiErrorCode } from "../types";

/**
 * Convert various error types to API response
 */
export function handleError(error: unknown): NextResponse {
  // Known API error
  if (error instanceof ApiError) {
    return NextResponse.json(
      formatErrorEntity({
        message: error.message,
        code: error.code,
        details: error.details,
      }),
      { status: error.statusCode }
    );
  }

  // Convex errors (e.g., query not found)
  if (error instanceof Error && error.message.includes("Query")) {
    logger.error({
      error: error.message,
      type: "ConvexError",
    });

    return NextResponse.json(
      formatErrorEntity({
        message: "Resource not found",
        code: ApiErrorCode.NOT_FOUND,
      }),
      { status: 404 }
    );
  }

  // Unknown error
  logger.error({
    error: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    formatErrorEntity({
      message: "Internal server error",
      code: ApiErrorCode.INTERNAL_ERROR,
    }),
    { status: 500 }
  );
}

/**
 * Common error factories
 */
export const errors = {
  unauthorized: (message = "Authentication required") =>
    new ApiError(message, ApiErrorCode.UNAUTHORIZED, 401),

  forbidden: (message = "Access denied") =>
    new ApiError(message, ApiErrorCode.FORBIDDEN, 403),

  notFound: (resource: string, id?: string) =>
    new ApiError(
      `${resource}${id ? ` '${id}'` : ""} not found`,
      ApiErrorCode.NOT_FOUND,
      404
    ),

  validation: (message: string, details?: unknown) =>
    new ApiError(message, ApiErrorCode.VALIDATION_ERROR, 400, details),

  rateLimit: (message = "Rate limit exceeded") =>
    new ApiError(message, ApiErrorCode.RATE_LIMIT, 429),

  internal: (message = "Internal server error") =>
    new ApiError(message, ApiErrorCode.INTERNAL_ERROR, 500),
};
```

### Step 5: Create Health Check Endpoint

**Goal**: First working API route, validate all infrastructure

**Action**: Implement `/api/v1/health` with full pattern

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/health/route.ts`

**Code**:
```typescript
// src/app/api/v1/health/route.ts
import { NextResponse } from "next/server";
import { formatEntity } from "@/lib/utils/formatEntity";
import { logger } from "@/lib/logger";
import { withOptionalAuth } from "@/lib/api/middleware/auth";

/**
 * Health check endpoint
 * Public (no auth required), but logs userId if present
 */
export const GET = withOptionalAuth(async (req, { userId }) => {
  const startTime = Date.now();

  try {
    // Check critical services (add more checks as needed)
    const checks = {
      api: true,
      // Future: database: await checkDatabase(),
      // Future: convex: await checkConvex(),
    };

    const allHealthy = Object.values(checks).every((v) => v);
    const status = allHealthy ? "ok" : "degraded";

    logger.info({
      endpoint: "/api/v1/health",
      status,
      userId: userId || "anonymous",
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      formatEntity(
        {
          status,
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          checks,
        },
        "health"
      ),
      {
        status: allHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    logger.error({
      endpoint: "/api/v1/health",
      error: error instanceof Error ? error.message : "Health check failed",
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      formatEntity(
        {
          status: "error",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        },
        "health"
      ),
      { status: 503 }
    );
  }
});

// Disable caching for health checks
export const dynamic = "force-dynamic";
```

### Step 6: Create API Utilities

**Goal**: Helper functions used across routes

**Action**: Create common utilities (pagination, validation, etc.)

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/utils.ts`

**Code**:
```typescript
// src/lib/api/utils.ts
import { NextRequest } from "next/server";
import type { PaginatedResponse } from "./types";

/**
 * Extract pagination params from query string
 */
export function getPaginationParams(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10);

  return {
    page: Math.max(1, page),
    pageSize: Math.min(100, Math.max(1, pageSize)), // Cap at 100
  };
}

/**
 * Build paginated response
 */
export function buildPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      hasNext: page * pageSize < total,
    },
  };
}

/**
 * Parse JSON body safely
 */
export async function parseBody<T>(req: NextRequest): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/**
 * Get query param safely
 */
export function getQueryParam(
  req: NextRequest,
  key: string,
  defaultValue?: string
): string | undefined {
  return req.nextUrl.searchParams.get(key) || defaultValue;
}

/**
 * Validate required fields in object
 */
export function validateRequired<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter((field) => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}
```

### Step 7: Update Documentation

**Goal**: Document new patterns for team

**Action**: Create foundation reference

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api-migration/FOUNDATION.md`

**Code**:
```markdown
# API Foundation

Core infrastructure used by all API routes.

## Directory Structure

\`\`\`
src/lib/api/
├── dal/              # Data Access Layer (Convex wrappers)
├── middleware/       # Auth, logging, errors
├── types.ts          # Shared API types
└── utils.ts          # Common utilities

src/app/api/v1/       # Version 1 API routes
├── health/
└── [resource]/
\`\`\`

## Patterns

### 1. Creating Authenticated Route

\`\`\`typescript
// src/app/api/v1/example/route.ts
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";

export const GET = withAuth(async (req, { userId }) => {
  // userId guaranteed present
  const data = await fetchData(userId);
  return NextResponse.json(formatEntity(data, "example"));
});
\`\`\`

### 2. Using Data Access Layer

\`\`\`typescript
import { usersDAL } from "@/lib/api/dal";

const user = await usersDAL.getCurrent(userId);
\`\`\`

### 3. Throwing Errors

\`\`\`typescript
import { errors } from "@/lib/api/middleware/errors";

if (!conversation) {
  throw errors.notFound("Conversation", conversationId);
}
\`\`\`

### 4. Pagination

\`\`\`typescript
import { getPaginationParams, buildPaginatedResponse } from "@/lib/api/utils";

const { page, pageSize } = getPaginationParams(req);
const items = await fetchItems(userId, page, pageSize);
const total = await countItems(userId);

return NextResponse.json(
  formatEntity(
    buildPaginatedResponse(items, page, pageSize, total),
    "list"
  )
);
\`\`\`

## Testing

\`\`\`bash
# Health check
curl http://localhost:3000/api/v1/health

# With auth (get token from Clerk dashboard)
curl -H "Authorization: Bearer <token>" \\
  http://localhost:3000/api/v1/example
\`\`\`
\`\`\`

## Code Examples & Patterns

### Pattern 1: Complete Route Handler

```typescript
// src/app/api/v1/conversations/route.ts (preview for Phase 1)
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { conversationsDAL } from "@/lib/api/dal";
import { getPaginationParams, buildPaginatedResponse } from "@/lib/api/utils";

export const GET = withAuth(async (req, { userId }) => {
  // Extract pagination
  const { page, pageSize } = getPaginationParams(req);

  // Fetch from DAL
  const conversations = await conversationsDAL.list(userId, page, pageSize);
  const total = await conversationsDAL.count(userId);

  // Build response
  return NextResponse.json(
    formatEntity(
      buildPaginatedResponse(conversations, page, pageSize, total),
      "list"
    )
  );
});

export const dynamic = "force-dynamic"; // Disable Next.js cache
```

### Pattern 2: Error Handling

```typescript
import { errors } from "@/lib/api/middleware/errors";

export const GET = withAuth(async (req, { userId, params }) => {
  const { id } = params;

  // Validate
  if (!id) {
    throw errors.validation("Conversation ID required");
  }

  // Fetch
  const conversation = await conversationsDAL.getById(id, userId);

  if (!conversation) {
    throw errors.notFound("Conversation", id);
  }

  // Check ownership
  if (conversation.userId !== userId) {
    throw errors.forbidden("You don't own this conversation");
  }

  return NextResponse.json(formatEntity(conversation, "conversation"));
});
```

### Pattern 3: Request Validation

```typescript
import { z } from "zod";
import { parseBody } from "@/lib/api/utils";
import { errors } from "@/lib/api/middleware/errors";

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  modelId: z.string().min(1),
});

export const POST = withAuth(async (req, { userId }) => {
  // Parse body
  const body = await parseBody(req);

  // Validate with Zod
  const result = createConversationSchema.safeParse(body);
  if (!result.success) {
    throw errors.validation("Invalid request", result.error.flatten());
  }

  // Create
  const conversation = await conversationsDAL.create(userId, result.data);

  return NextResponse.json(
    formatEntity(conversation, "conversation"),
    { status: 201 }
  );
});
```

## Testing & Validation

### Manual Testing

**1. Health Check**
```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "success",
  "sys": {
    "entity": "health",
    "timestamps": {
      "retrieved": "2025-12-10T12:00:00.000Z"
    }
  },
  "data": {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2025-12-10T12:00:00.000Z",
    "checks": {
      "api": true
    }
  }
}
```

**2. Check Logs**
```bash
# Start dev server
bun dev

# In another terminal, hit endpoint
curl http://localhost:3000/api/v1/health

# Should see in logs:
# {"level":"info","endpoint":"/api/v1/health","status":"ok","userId":"anonymous","duration":12}
```

**3. Test Auth Middleware**
```bash
# Get Clerk session token from browser DevTools
# Application > Cookies > __session

curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/health
```

### Automated Testing (future)

```typescript
// tests/api/health.test.ts (create in Phase 8)
import { GET } from "@/app/api/v1/health/route";

describe("GET /api/v1/health", () => {
  it("returns 200 with health status", async () => {
    const req = new Request("http://localhost:3000/api/v1/health");
    const res = await GET(req, {});

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("success");
    expect(data.data.status).toBe("ok");
  });
});
```

## Success Criteria

- [x] `/api/v1/health` endpoint returns 200
- [x] Response follows envelope format
- [x] Requests logged with Pino
- [x] Auth middleware extracts userId
- [x] Errors return consistent format
- [x] DAL pattern demonstrated (users)
- [x] Types defined and exported
- [x] Documentation created

## Common Pitfalls

### Pitfall 1: Forgetting `export const dynamic`
**Problem**: Next.js 15 caches route handlers by default
**Solution**: Add `export const dynamic = "force-dynamic"` to real-time routes

### Pitfall 2: Not awaiting `auth()`
**Problem**: `auth()` returns a promise in Next.js 15
**Solution**: Always `const { userId } = await auth()`

### Pitfall 3: Mixing Convex client and server APIs
**Problem**: `useQuery` doesn't work in route handlers
**Solution**: Use `fetchQuery` from `convex/nextjs` in DAL

### Pitfall 4: Exposing Convex internals
**Problem**: Returning raw Convex documents leaks internal structure
**Solution**: Transform through DAL, use envelope format

### Pitfall 5: Inconsistent error handling
**Problem**: Some routes throw, some return error responses
**Solution**: Always throw `ApiError`, let middleware handle response

## Next Steps

After completing Phase 0:

**Immediate next**: [Phase 1: Mutations](./phase-1-mutations.md)
- Create POST/PATCH/DELETE routes for conversations, messages
- Migrate `ChatInput.tsx` to `useMutation` from React Query
- Test creating messages via API

**Testing checklist**:
1. Health endpoint works ✅
2. Logs appear in console ✅
3. Auth middleware tested ✅
4. Error responses consistent ✅
5. Ready to add first resource route ✅

**Directory snapshot**:
```
src/lib/api/
├── dal/
│   ├── index.ts
│   └── users.ts
├── middleware/
│   ├── auth.ts
│   └── errors.ts
├── types.ts
└── utils.ts

src/app/api/v1/
└── health/
    └── route.ts
```

Now ready for Phase 1: Mutations (create conversations, send messages, update preferences).
