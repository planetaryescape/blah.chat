"use client";

import { format, isToday, isYesterday } from "date-fns";

interface DateSeparatorProps {
  timestamp: number;
}

function getDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "EEEE, MMMM d");
  }
  return format(date, "EEEE, MMMM d, yyyy");
}

export function DateSeparator({ timestamp }: DateSeparatorProps) {
  return (
    <div
      className="flex items-center gap-3 py-4 select-none"
      aria-hidden="true"
    >
      <div className="flex-1 h-px bg-border/30" />
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground/50 uppercase">
        {getDateLabel(timestamp)}
      </span>
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}
