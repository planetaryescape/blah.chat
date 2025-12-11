"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getLastNDays, formatDateToISO } from "@/lib/utils/date";
import { format } from "date-fns";

interface DateRangePickerProps {
  value: { startDate: string; endDate: string };
  onChange: (range: { startDate: string; endDate: string }) => void;
  className?: string;
}

type PresetKey = "7d" | "30d" | "90d";

const PRESETS: Record<PresetKey, { label: string; days: number }> = {
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
};

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<PresetKey | null>("30d");
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);

  // Update local state when value changes externally
  useEffect(() => {
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
  }, [value]);

  const handlePresetClick = (preset: PresetKey) => {
    const range = getLastNDays(PRESETS[preset].days);
    onChange(range);
    setActivePreset(preset);
  };

  const handleCustomApply = () => {
    onChange({ startDate: customStart, endDate: customEnd });
    setActivePreset(null);
  };

  const formatDisplayDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Preset Buttons */}
      {(Object.keys(PRESETS) as PresetKey[]).map((preset) => (
        <Button
          key={preset}
          variant={activePreset === preset ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetClick(preset)}
          className="min-w-[80px]"
        >
          {PRESETS[preset].label}
        </Button>
      ))}

      {/* Custom Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === null ? "default" : "outline"}
            size="sm"
            className="min-w-[200px] justify-start text-left font-normal"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {activePreset === null ? (
              <span>
                {formatDisplayDate(value.startDate)} -{" "}
                {formatDisplayDate(value.endDate)}
              </span>
            ) : (
              <span className="text-muted-foreground">Custom</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <div className="space-y-4">
            <div>
              <label htmlFor="start-date" className="text-sm font-medium mb-2 block">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="text-sm font-medium mb-2 block">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart}
                max={formatDateToISO(new Date())}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button onClick={handleCustomApply} className="w-full">
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
