"use client";

import { Plug2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrationTimelineEventProps {
  action: "enabled" | "disabled";
  integrationName: string;
}

export function IntegrationTimelineEvent({
  action,
  integrationName,
}: IntegrationTimelineEventProps) {
  const isEnabled = action === "enabled";

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
          isEnabled
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-muted-foreground/20 bg-muted/50 text-muted-foreground",
        )}
      >
        {isEnabled ? (
          <Plug2 className="h-3.5 w-3.5" />
        ) : (
          <Unplug className="h-3.5 w-3.5" />
        )}
        <span>
          {isEnabled ? "Enabled" : "Disabled"} {integrationName} for this chat
        </span>
      </div>
    </div>
  );
}
