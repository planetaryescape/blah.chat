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
  it("formats a mid-month UTC date as YYYY-MM-DD", () => {
    const date = new Date("2024-03-15T10:30:00Z");
    expect(formatDateToISO(date)).toBe("2024-03-15");
  });

  it("pads single-digit month and day", () => {
    const date = new Date("2024-01-05T00:00:00Z");
    expect(formatDateToISO(date)).toBe("2024-01-05");
  });

  it("handles year boundary (Dec 31)", () => {
    const date = new Date("2024-12-31T23:59:00Z");
    expect(formatDateToISO(date)).toBe("2024-12-31");
  });

  it("handles leap day", () => {
    const date = new Date("2024-02-29T12:00:00Z");
    expect(formatDateToISO(date)).toBe("2024-02-29");
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
    expect(result).toEqual({ startDate: "2024-02-14", endDate: "2024-03-15" });
  });

  it("accepts custom day count", () => {
    const result = getLastNDays(7);
    expect(result).toEqual({ startDate: "2024-03-08", endDate: "2024-03-15" });
  });

  it("handles 0 days (today only)", () => {
    const result = getLastNDays(0);
    expect(result.startDate).toBe(result.endDate);
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
    expect(result).toEqual({ startDate: "2024-03-01", endDate: "2024-03-15" });
  });
});

describe("formatCompactNumber", () => {
  it("returns number as-is for values under 1000", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(999)).toBe("999");
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
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidISODate("2024-03-15")).toBe(true);
    expect(isValidISODate("2024-01-01")).toBe(true);
  });

  it("rejects wrong separators and formats", () => {
    expect(isValidISODate("03-15-2024")).toBe(false);
    expect(isValidISODate("2024/03/15")).toBe(false);
    expect(isValidISODate("2024-3-15")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidISODate("")).toBe(false);
  });

  it("rejects non-date strings matching the pattern", () => {
    expect(isValidISODate("2024-13-01")).toBe(false);
    expect(isValidISODate("2024-00-15")).toBe(false);
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
    expect(isOverdue(new Date("2024-03-14T12:00:00Z").getTime())).toBe(true);
  });

  it("returns false for future deadlines", () => {
    expect(isOverdue(new Date("2024-03-16T12:00:00Z").getTime())).toBe(false);
  });
});

describe("getEndOfDayTimestamp", () => {
  it("returns timestamp at 23:59:59 for given date", () => {
    const result = getEndOfDayTimestamp("2024-03-15");
    const date = new Date(result);
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
    expect(date.getSeconds()).toBe(59);
  });

  it("always returns a value greater than start of same day", () => {
    const start = getStartOfDayTimestamp("2024-03-15");
    const end = getEndOfDayTimestamp("2024-03-15");
    expect(end).toBeGreaterThan(start);
  });
});

describe("getStartOfDayTimestamp", () => {
  it("returns midnight UTC timestamp for given date", () => {
    const result = getStartOfDayTimestamp("2024-03-15");
    const date = new Date(result);
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(0);
  });

  it("returns the exact start of the UTC day", () => {
    const result = getStartOfDayTimestamp("2024-03-15");
    expect(result).toBe(new Date("2024-03-15T00:00:00Z").getTime());
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

  it("shows 'Overdue' for past deadlines", () => {
    const result = formatDeadline(new Date("2024-03-14T12:00:00Z").getTime());
    expect(result).toMatch(/^Overdue by/);
  });

  it("shows 'Due today' for same-day deadlines", () => {
    const result = formatDeadline(new Date("2024-03-15T14:30:00Z").getTime());
    expect(result).toMatch(/^Due today at/);
  });

  it("shows 'Due in' for future deadlines", () => {
    const result = formatDeadline(new Date("2024-03-17T12:00:00Z").getTime());
    expect(result).toMatch(/^Due in/);
  });
});
