import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ThinkingEffort = "low" | "medium" | "high";

interface ThinkingEffortSelectorProps {
  value: ThinkingEffort;
  onChange: (effort: ThinkingEffort) => void;
  className?: string;
}

const efforts = [
  { value: "low", label: "Low Reasoning" },
  { value: "medium", label: "Medium Reasoning" },
  { value: "high", label: "High Reasoning" },
] as const;

export function ThinkingEffortSelector({
  value,
  onChange,
  className,
}: ThinkingEffortSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ThinkingEffort)}>
      <SelectTrigger
        className={cn(
          "h-7 text-xs border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 rounded-full transition-colors min-w-0 w-auto font-medium gap-1",
          className,
        )}
      >
        <SelectValue placeholder="Reasoning effort" />
      </SelectTrigger>
      <SelectContent>
        {efforts.map((effort: any) => (
          <SelectItem
            key={effort.value}
            value={effort.value}
            className="text-xs"
          >
            {effort.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
