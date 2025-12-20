import {
    endOfDay,
    format,
    formatDistanceToNow,
    isPast,
    isToday,
    startOfMonth,
    subDays,
} from "date-fns";

/**
 * Formats a date to YYYY-MM-DD format (ISO 8601 date string)
 * This format is used consistently in the database for date fields
 */
export function formatDateToISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Gets the date range for the last N days
 * @param days Number of days to go back (default: 30)
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getLastNDays(days = 30): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = subDays(end, days);

  return {
    startDate: formatDateToISO(start),
    endDate: formatDateToISO(end),
  };
}

/**
 * Gets a validated date range from localStorage, resetting to fresh values if stale
 * This prevents issues where cached date ranges don't include today's data
 * @param storageKey localStorage key to read from
 * @param defaultDays Number of days for default range (default: 30)
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getValidatedDateRange(
  storageKey: string,
  defaultDays = 30,
): { startDate: string; endDate: string } {
  const freshRange = getLastNDays(defaultDays);

  if (typeof window === "undefined") {
    return freshRange;
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return freshRange;
    }

    const parsed = JSON.parse(stored) as { startDate: string; endDate: string };
    const today = formatDateToISO(new Date());

    // If endDate is before today, the range is stale - reset to fresh
    if (parsed.endDate < today) {
      // Clear the stale data
      localStorage.removeItem(storageKey);
      return freshRange;
    }

    return parsed;
  } catch {
    return freshRange;
  }
}

/**
 * Gets the date range for the current month (from 1st to today)
 * @returns Object with startDate and endDate in YYYY-MM-DD format
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const monthStart = startOfMonth(now);

  return {
    startDate: formatDateToISO(monthStart),
    endDate: formatDateToISO(now),
  };
}

/**
 * Formats a number with K/M/B suffixes for compact display
 * @param num Number to format
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.2K", "3.5M")
 */
export function formatCompactNumber(num: number, decimals = 1): string {
  if (num < 1000) return num.toString();

  const units = ["K", "M", "B", "T"];
  const magnitude = Math.floor(Math.log10(num) / 3);
  const value = num / 10 ** (magnitude * 3);

  return `${value.toFixed(decimals)}${units[magnitude - 1]}`;
}

/**
 * Formats a number as USD currency
 * @param amount Amount in USD
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$45.32")
 */
export function formatCurrency(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Parses an ISO date string (YYYY-MM-DD) to a Date object
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function parseISODate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Gets the end of day timestamp for a date string
 * Used for inclusive date range filtering
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Timestamp (milliseconds) for end of day
 */
export function getEndOfDayTimestamp(dateStr: string): number {
  return endOfDay(new Date(dateStr)).getTime();
}

/**
 * Gets the start of day timestamp for a date string
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Timestamp (milliseconds) for start of day (00:00:00)
 */
export function getStartOfDayTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

/**
 * Validates if a string is a valid YYYY-MM-DD date
 * @param dateStr Date string to validate
 * @returns true if valid, false otherwise
 */
export function isValidISODate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Format deadline as relative time with context
 * Examples: "Due in 2 hours", "Overdue by 3 days", "Due today at 2:30 PM"
 */
export function formatDeadline(deadline: number): string {
  const date = new Date(deadline);

  if (isPast(date)) {
    return `Overdue by ${formatDistanceToNow(date)}`;
  }

  if (isToday(date)) {
    return `Due today at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return `Due in ${formatDistanceToNow(date)}`;
}

/**
 * Check if deadline has passed
 */
export function isOverdue(deadline: number): boolean {
  return isPast(new Date(deadline));
}
