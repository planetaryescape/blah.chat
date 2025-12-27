"use client";

import { Ghost } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IncognitoBadgeProps {
  className?: string;
}

export function IncognitoBadge({ className }: IncognitoBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-7 text-xs px-3 rounded-full cursor-default select-none",
            "border-violet-500/30 bg-violet-500/5",
            "text-violet-400",
            "transition-colors duration-200",
            className,
          )}
        >
          <Ghost className="size-3 mr-1.5 opacity-80" />
          Incognito
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">Ephemeral chat - no memories saved</p>
      </TooltipContent>
    </Tooltip>
  );
}
