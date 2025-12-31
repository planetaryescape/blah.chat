import {
  endOfDay,
  format,
  formatDistanceToNow,
  isPast,
  isToday,
  startOfMonth,
  subDays,
} from "date-fns";

/** Format date to YYYY-MM-DD (ISO 8601 date string) */
export function formatDateToISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Get date range for last N days */
export function getLastNDays(days = 30): { startDate: string; endDate: string } {
  const end = new Date();
  return { startDate: formatDateToISO(subDays(end, days)), endDate: formatDateToISO(end) };
}

/** Get current month range (1st to today) */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return { startDate: formatDateToISO(startOfMonth(now)), endDate: formatDateToISO(now) };
}

/** Format number with K/M/B suffixes */
export function formatCompactNumber(num: number, decimals = 1): string {
  if (num < 1000) return num.toString();
  const units = ["K", "M", "B", "T"];
  const magnitude = Math.floor(Math.log10(num) / 3);
  return `${(num / 10 ** (magnitude * 3)).toFixed(decimals)}${units[magnitude - 1]}`;
}

/** Format as USD currency */
export function formatCurrency(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Parse ISO date string (YYYY-MM-DD) to Date */
export function parseISODate(dateStr: string): Date {
  return new Date(dateStr);
}

/** Get end of day timestamp for date string */
export function getEndOfDayTimestamp(dateStr: string): number {
  return endOfDay(new Date(dateStr)).getTime();
}

/** Get start of day timestamp for date string */
export function getStartOfDayTimestamp(dateStr: string): number {
  return new Date(dateStr).getTime();
}

/** Validate YYYY-MM-DD date format */
export function isValidISODate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/** Format deadline as relative time */
export function formatDeadline(deadline: number): string {
  const date = new Date(deadline);
  if (isPast(date)) return `Overdue by ${formatDistanceToNow(date)}`;
  if (isToday(date)) {
    return `Due today at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return `Due in ${formatDistanceToNow(date)}`;
}

/** Check if deadline has passed */
export function isOverdue(deadline: number): boolean {
  return isPast(new Date(deadline));
}
