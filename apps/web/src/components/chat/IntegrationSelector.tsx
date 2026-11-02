"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, Plug2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function IntegrationSelector({
  conversationId,
  onSavingChange,
}: {
  conversationId: Id<"conversations">;
  onSavingChange: (saving: boolean) => void;
}) {
  const connections = useQuery(api.composio.connections.getActiveConnections);
  const selectedIds = useQuery(api.composio.selection.getSelectedIds, {
    conversationId,
  });
  const toggle = useMutation(api.composio.selection.toggle);
  const [saving, setSaving] = useState(false);

  async function handleToggle(connectionId: Id<"composioConnections">) {
    if (saving) return;
    setSaving(true);
    onSavingChange(true);
    try {
      await toggle({ conversationId, connectionId });
    } catch {
      toast.error(
        "Could not change integrations. Wait for any active response, then try again.",
      );
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2"
          aria-label="Select integrations for this chat"
        >
          <Plug2 className="h-3.5 w-3.5" />
          <span className="text-xs">
            {selectedIds === undefined
              ? "Tools…"
              : selectedIds.length
                ? `${selectedIds.length} tools`
                : "No tools"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2">
        <p className="text-sm font-medium">Integrations for this chat</p>
        <p className="text-xs text-muted-foreground">
          Only selected connections can be used by your messages.
        </p>
        {connections?.map((connection) => (
          <Button
            key={connection._id}
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2"
            aria-pressed={selectedIds?.includes(connection._id) ?? false}
            disabled={saving || selectedIds === undefined}
            onClick={() => void handleToggle(connection._id)}
          >
            <Check
              className={
                selectedIds?.includes(connection._id)
                  ? "h-4 w-4"
                  : "h-4 w-4 opacity-0"
              }
            />
            {connection.integrationName}
          </Button>
        ))}
        {connections?.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No connected integrations.
          </p>
        )}
        <Link
          href="/settings?tab=integrations"
          className="block text-xs underline"
        >
          Manage connections
        </Link>
      </PopoverContent>
    </Popover>
  );
}
