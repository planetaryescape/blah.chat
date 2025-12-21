# Phase 5: Utility Unit Tests

**Priority:** P2 (Medium)
**Estimated Effort:** 2-3 hours
**Prerequisites:** Phase 1 (vitest.config.ts)

---

## Context

blah.chat has utility functions in `src/lib/utils/` that handle:
- Date formatting and validation
- API response formatting (envelope pattern)
- Payload optimization
- String manipulation

These are pure functions - easy to test, fast to run, high confidence.

---

## What Already Exists (REUSE)

| Asset | Location | Purpose |
|-------|----------|---------|
| `formatEntity`, `formatEntityList` | `src/lib/utils/formatEntity.ts` | API envelope |
| Date utilities | `src/lib/utils/date.ts` | Date handling |
| `compact`, `pick`, `omit` | `src/lib/utils/payload.ts` | Payload optimization |
| `ApiResponse<T>` type | `src/lib/api/types.ts` | Response type |

---

## What This Phase Creates

```
src/lib/utils/__tests__/
├── formatEntity.test.ts    # API envelope tests
├── date.test.ts            # Date utility tests
├── payload.test.ts         # Payload optimization tests
docs/testing/
└── phase-5-utilities.md    # This document
```

---

## Step-by-Step Implementation

### Step 1: Create formatEntity Tests

```typescript
// src/lib/utils/__tests__/formatEntity.test.ts
//
// Tests for API envelope pattern
// Uses existing ApiResponse type

import { describe, it, expect } from "vitest";
import {
  formatEntity,
  formatEntityList,
  formatErrorEntity,
} from "../formatEntity";
import type { ApiResponse } from "@/lib/api/types";

describe("formatEntity", () => {
  describe("basic formatting", () => {
    it("wraps data in success envelope", () => {
      const data = { id: "123", name: "Test" };
      const result = formatEntity(data, "user");

      expect(result.status).toBe("success");
      expect(result.sys.entity).toBe("user");
      expect(result.data).toBeDefined();
    });

    it("includes id in sys when provided", () => {
      const result = formatEntity({ name: "Test" }, "user", "user-123");

      expect(result.sys.id).toBe("user-123");
    });

    it("omits id when not provided", () => {
      const result = formatEntity({ name: "Test" }, "user");

      expect(result.sys.id).toBeUndefined();
    });
  });

  describe("timestamps", () => {
    it("extracts _creationTime as created timestamp", () => {
      const data = { _creationTime: 1703001600000, name: "Test" };
      const result = formatEntity(data, "user");

      expect(result.sys.timestamps?.created).toBe("2023-12-19T16:00:00.000Z");
    });

    it("extracts updatedAt as updated timestamp", () => {
      const data = { updatedAt: 1703001600000, name: "Test" };
      const result = formatEntity(data, "user");

      expect(result.sys.timestamps?.updated).toBe("2023-12-19T16:00:00.000Z");
    });

    it("always includes retrieved timestamp", () => {
      const data = { name: "Test" };
      const result = formatEntity(data, "user");

      expect(result.sys.timestamps?.retrieved).toBeDefined();
      // Should be a valid ISO date string
      expect(new Date(result.sys.timestamps!.retrieved!).toISOString()).toBeTruthy();
    });
  });

  describe("data compaction", () => {
    it("removes null values from data", () => {
      const data = { id: "123", name: null, email: "test@test.com" };
      const result = formatEntity(data, "user");

      expect(result.data).not.toHaveProperty("name");
      expect(result.data).toHaveProperty("email");
    });

    it("removes undefined values from data", () => {
      const data = { id: "123", name: undefined, email: "test@test.com" };
      const result = formatEntity(data, "user");

      expect(result.data).not.toHaveProperty("name");
    });

    it("removes empty strings from data", () => {
      const data = { id: "123", name: "", email: "test@test.com" };
      const result = formatEntity(data, "user");

      expect(result.data).not.toHaveProperty("name");
    });

    it("preserves zero values", () => {
      const data = { id: "123", count: 0 };
      const result = formatEntity(data, "user");

      expect(result.data).toHaveProperty("count", 0);
    });

    it("preserves false values", () => {
      const data = { id: "123", isActive: false };
      const result = formatEntity(data, "user");

      expect(result.data).toHaveProperty("isActive", false);
    });
  });

  describe("type safety", () => {
    it("returns typed ApiResponse", () => {
      interface User {
        id: string;
        name: string;
      }

      const data: User = { id: "123", name: "Test" };
      const result: ApiResponse<User> = formatEntity(data, "user");

      expect(result.data?.id).toBe("123");
    });
  });
});

describe("formatEntityList", () => {
  it("wraps array in list envelope", () => {
    const items = [
      { _id: "1", name: "One" },
      { _id: "2", name: "Two" },
    ];
    const result = formatEntityList(items, "user");

    expect(result.status).toBe("success");
    expect(result.sys.entity).toBe("list");
    expect(result.data).toHaveLength(2);
  });

  it("wraps each item with entity metadata", () => {
    const items = [{ _id: "1", name: "Test" }];
    const result = formatEntityList(items, "user");

    expect(result.data?.[0].sys.entity).toBe("user");
    expect(result.data?.[0].sys.id).toBe("1");
    expect(result.data?.[0].data.name).toBe("Test");
  });

  it("handles empty array", () => {
    const result = formatEntityList([], "user");

    expect(result.status).toBe("success");
    expect(result.data).toEqual([]);
  });

  it("compacts each item's data", () => {
    const items = [{ _id: "1", name: "Test", nullField: null }];
    const result = formatEntityList(items, "user");

    expect(result.data?.[0].data).not.toHaveProperty("nullField");
  });
});

describe("formatErrorEntity", () => {
  it("formats string error", () => {
    const result = formatErrorEntity("Something went wrong");

    expect(result.status).toBe("error");
    expect(result.sys.entity).toBe("error");
    expect(result.error).toBe("Something went wrong");
  });

  it("formats Error instance", () => {
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

  it("formats error object with details", () => {
    const error = {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { field: "email", issue: "invalid format" },
    };
    const result = formatErrorEntity(error);

    expect((result.error as any).details.field).toBe("email");
  });
});
```

### Step 2: Create Date Utility Tests

```typescript
// src/lib/utils/__tests__/date.test.ts
//
// Tests for date utilities

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDateToISO,
  getLastNDays,
  getCurrentMonthRange,
  formatCompactNumber,
  formatCurrency,
  isValidISODate,
  isOverdue,
  getEndOfDayTimestamp,
  getStartOfDayTimestamp,
} from "../date";

describe("formatDateToISO", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date("2024-03-15T10:30:00Z");
    const result = formatDateToISO(date);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toContain("2024");
    expect(result).toContain("03");
    expect(result).toContain("15");
  });

  it("handles single digit months/days with padding", () => {
    const date = new Date("2024-01-05T10:30:00Z");
    const result = formatDateToISO(date);

    expect(result).toContain("01");
    expect(result).toContain("05");
  });
});

describe("getLastNDays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns range for last 30 days by default", () => {
    const result = getLastNDays();

    expect(result.endDate).toBe("2024-03-15");
    expect(result.startDate).toBe("2024-02-14");
  });

  it("accepts custom day count", () => {
    const result = getLastNDays(7);

    expect(result.endDate).toBe("2024-03-15");
    expect(result.startDate).toBe("2024-03-08");
  });

  it("returns valid ISO date strings", () => {
    const result = getLastNDays(30);

    expect(isValidISODate(result.startDate)).toBe(true);
    expect(isValidISODate(result.endDate)).toBe(true);
  });
});

describe("getCurrentMonthRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns first of month to today", () => {
    const result = getCurrentMonthRange();

    expect(result.startDate).toBe("2024-03-01");
    expect(result.endDate).toBe("2024-03-15");
  });
});

describe("formatCompactNumber", () => {
  it("returns number as-is for values under 1000", () => {
    expect(formatCompactNumber(999)).toBe("999");
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(500)).toBe("500");
  });

  it("formats thousands with K suffix", () => {
    expect(formatCompactNumber(1000)).toBe("1.0K");
    expect(formatCompactNumber(1500)).toBe("1.5K");
    expect(formatCompactNumber(12345)).toBe("12.3K");
  });

  it("formats millions with M suffix", () => {
    expect(formatCompactNumber(1000000)).toBe("1.0M");
    expect(formatCompactNumber(2500000)).toBe("2.5M");
  });

  it("formats billions with B suffix", () => {
    expect(formatCompactNumber(1000000000)).toBe("1.0B");
  });

  it("respects decimal places parameter", () => {
    expect(formatCompactNumber(1234, 2)).toBe("1.23K");
    expect(formatCompactNumber(1234, 0)).toBe("1K");
  });
});

describe("formatCurrency", () => {
  it("formats as USD with $ symbol", () => {
    expect(formatCurrency(45.32)).toBe("$45.32");
  });

  it("handles zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("adds thousands separator", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("respects decimal places parameter", () => {
    expect(formatCurrency(45.329, 3)).toBe("$45.329");
    expect(formatCurrency(45, 0)).toBe("$45");
  });

  it("handles negative values", () => {
    expect(formatCurrency(-10.5)).toBe("-$10.50");
  });
});

describe("isValidISODate", () => {
  it("accepts valid YYYY-MM-DD format", () => {
    expect(isValidISODate("2024-03-15")).toBe(true);
    expect(isValidISODate("2023-12-31")).toBe(true);
    expect(isValidISODate("2024-01-01")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidISODate("03-15-2024")).toBe(false);
    expect(isValidISODate("2024/03/15")).toBe(false);
    expect(isValidISODate("March 15, 2024")).toBe(false);
    expect(isValidISODate("2024-3-15")).toBe(false);
    expect(isValidISODate("")).toBe(false);
  });

  it("rejects invalid dates", () => {
    expect(isValidISODate("2024-02-30")).toBe(false);
    expect(isValidISODate("2024-13-01")).toBe(false);
  });
});

describe("isOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for past deadlines", () => {
    const pastDeadline = new Date("2024-03-14T12:00:00Z").getTime();
    expect(isOverdue(pastDeadline)).toBe(true);
  });

  it("returns false for future deadlines", () => {
    const futureDeadline = new Date("2024-03-16T12:00:00Z").getTime();
    expect(isOverdue(futureDeadline)).toBe(false);
  });
});

describe("getEndOfDayTimestamp", () => {
  it("returns end of day timestamp", () => {
    const result = getEndOfDayTimestamp("2024-03-15");
    const date = new Date(result);

    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
    expect(date.getSeconds()).toBe(59);
  });
});

describe("getStartOfDayTimestamp", () => {
  it("returns start of day timestamp", () => {
    const result = getStartOfDayTimestamp("2024-03-15");
    const date = new Date(result);

    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });
});
```

### Step 3: Create Payload Utility Tests

```typescript
// src/lib/utils/__tests__/payload.test.ts
//
// Tests for payload optimization utilities

import { describe, it, expect } from "vitest";
import { compact, pick, omit } from "../payload";

describe("compact", () => {
  describe("removing empty values", () => {
    it("removes null values", () => {
      const result = compact({ a: 1, b: null, c: 3 });

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("removes undefined values", () => {
      const result = compact({ a: 1, b: undefined, c: 3 });

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("removes empty strings", () => {
      const result = compact({ a: "hello", b: "", c: "world" });

      expect(result).toEqual({ a: "hello", c: "world" });
    });

    it("removes empty arrays", () => {
      const result = compact({ a: [1, 2], b: [], c: [3] });

      expect(result).toEqual({ a: [1, 2], c: [3] });
    });
  });

  describe("preserving valid values", () => {
    it("preserves zero", () => {
      const result = compact({ a: 0, b: 1 });

      expect(result).toEqual({ a: 0, b: 1 });
    });

    it("preserves false", () => {
      const result = compact({ a: false, b: true });

      expect(result).toEqual({ a: false, b: true });
    });

    it("preserves non-empty strings", () => {
      const result = compact({ a: "hello", b: " ", c: "world" });

      expect(result).toEqual({ a: "hello", b: " ", c: "world" });
    });

    it("preserves non-empty arrays", () => {
      const result = compact({ items: [1, 2, 3] });

      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe("nested objects", () => {
    it("recursively compacts nested objects", () => {
      const result = compact({
        outer: {
          inner: { a: 1, b: null },
          empty: null,
        },
      });

      expect(result).toEqual({
        outer: {
          inner: { a: 1 },
        },
      });
    });

    it("removes completely empty nested objects", () => {
      const result = compact({
        outer: {
          empty: { a: null, b: undefined },
        },
      });

      expect(result).toEqual({});
    });
  });

  describe("arrays with objects", () => {
    it("compacts objects within arrays", () => {
      const result = compact({
        items: [
          { a: 1, b: null },
          { c: 2, d: "" },
        ],
      });

      expect(result).toEqual({
        items: [{ a: 1 }, { c: 2 }],
      });
    });

    it("filters out empty objects from arrays", () => {
      const result = compact({
        items: [{ a: 1 }, { b: null }, { c: 2 }],
      });

      expect(result).toEqual({
        items: [{ a: 1 }, { c: 2 }],
      });
    });

    it("filters null/undefined from primitive arrays", () => {
      const result = compact({
        nums: [1, null, 2, undefined, 3],
      });

      expect(result).toEqual({
        nums: [1, 2, 3],
      });
    });
  });
});

describe("pick", () => {
  it("picks specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, ["a", "c"]);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("ignores keys that don't exist", () => {
    const obj = { a: 1, b: 2 };
    const result = pick(obj, ["a", "c" as keyof typeof obj]);

    expect(result).toEqual({ a: 1 });
  });

  it("returns empty object for no keys", () => {
    const obj = { a: 1, b: 2 };
    const result = pick(obj, []);

    expect(result).toEqual({});
  });

  it("preserves value types", () => {
    const obj = { name: "test", count: 42, active: true };
    const result = pick(obj, ["name", "active"]);

    expect(result).toEqual({ name: "test", active: true });
    expect(typeof result.name).toBe("string");
    expect(typeof result.active).toBe("boolean");
  });
});

describe("omit", () => {
  it("omits specified keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, ["b"]);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("handles keys that don't exist", () => {
    const obj = { a: 1, b: 2 };
    const result = omit(obj, ["c" as keyof typeof obj]);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("returns copy when no keys omitted", () => {
    const obj = { a: 1, b: 2 };
    const result = omit(obj, []);

    expect(result).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(obj); // Should be a new object
  });

  it("can omit multiple keys", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = omit(obj, ["b", "d"]);

    expect(result).toEqual({ a: 1, c: 3 });
  });
});
```

---

## Verification

Run utility tests:

```bash
# Run all tests
bun run test

# Run only utility tests
bun run test src/lib/utils

# Watch mode
bun run test -- --watch src/lib/utils

# With coverage
bun run test:coverage -- src/lib/utils
```

### Expected Outcomes:
- All pure function tests pass
- Edge cases handled (null, undefined, empty, zero)
- Type safety verified
- Coverage > 90% for utilities

---

## Key Patterns

### 1. Testing Pure Functions
Pure functions are deterministic - same input always produces same output:
```typescript
expect(formatCurrency(45.32)).toBe("$45.32");
```

### 2. Time Mocking
For date-dependent tests, use Vitest's fake timers:
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### 3. Edge Case Testing
Always test edge cases:
- Zero, negative numbers
- Empty strings, arrays, objects
- null, undefined
- Boundary conditions

---

## What Comes Next

**Phase 6: CI/CD Integration**
- GitHub Actions workflow
- Automated test runs on PR
- Coverage reporting

---

## Troubleshooting

### Timezone Issues
Date tests can fail in different timezones. Either:
1. Use UTC dates explicitly
2. Mock timezone
3. Test patterns not exact values

### Floating Point
Currency/number tests may need tolerance:
```typescript
expect(result).toBeCloseTo(45.32, 2);
```

### Object Comparison
For deep object comparison, `toEqual` works. For reference equality, use `toBe`.
