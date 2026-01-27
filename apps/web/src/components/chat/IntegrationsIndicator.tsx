"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Plug2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Shows a small indicator when the user has active Composio integrations.
 * Hover shows list of connected services, click goes to settings.
 */
export function IntegrationsIndicator() {
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  const connections = useQuery(api.composio.connections.getActiveConnections);

  // Don't render if no connections or still loading
  if (!connections || connections.length === 0) {
    return null;
  }

  const connectionNames = connections.map((c) => c.integrationName);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1.5",
            "text-emerald-600 dark:text-emerald-400",
            "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
          )}
          asChild
        >
          <Link href="/settings?tab=integrations">
            <Plug2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{connections.length}</span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-xs">
        <div className="space-y-1">
          <p className="text-xs font-medium">Connected integrations</p>
          <p className="text-xs text-muted-foreground">
            {connectionNames.join(", ")}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
