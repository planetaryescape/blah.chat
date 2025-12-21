/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatCompactNumber,
  formatCurrency,
  formatDateToISO,
  formatDeadline,
  getCurrentMonthRange,
  getEndOfDayTimestamp,
  getLastNDays,
  getStartOfDayTimestamp,
  isOverdue,
  isValidISODate,
} from "../date";

describe("formatDateToISO", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date("2024-03-15T10:30:00Z");
    const result = formatDateToISO(date);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("pads single digit months and days", () => {
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

  it("handles zero", () => {
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

    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
  });
});

describe("formatDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows overdue for past deadlines", () => {
    const pastDeadline = new Date("2024-03-14T12:00:00Z").getTime();
    const result = formatDeadline(pastDeadline);

    expect(result).toContain("Overdue");
  });

  it("shows due today for same-day deadlines", () => {
    const todayDeadline = new Date("2024-03-15T14:30:00Z").getTime();
    const result = formatDeadline(todayDeadline);

    expect(result).toContain("Due today");
  });

  it("shows due in for future deadlines", () => {
    const futureDeadline = new Date("2024-03-17T12:00:00Z").getTime();
    const result = formatDeadline(futureDeadline);

    expect(result).toContain("Due in");
  });
});
