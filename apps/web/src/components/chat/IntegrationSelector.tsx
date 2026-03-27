"use client";

import type { ComposioConnection } from "@blah-chat/api-client";
import { INTEGRATIONS_BY_ID } from "@blah-chat/shared/integrations";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Plug2, Unplug } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSDKClient } from "@/lib/api/sdkClient";
import { cn } from "@/lib/utils";

interface IntegrationSelectorProps {
  selectedIntegrationIds: string[];
  onToggleIntegration: (integrationId: string) => void;
  isSaving?: boolean;
}

function getIntegrationName(integrationId: string, connectionName?: string) {
  return (
    connectionName ??
    INTEGRATIONS_BY_ID.get(integrationId)?.name ??
    integrationId
  );
}

function buildTriggerLabel(
  selected: Array<{ integrationId: string; name: string }>,
) {
  if (selected.length === 0) {
    return "No tools";
  }

  if (selected.length === 1) {
    return selected[0]?.name ?? "1 tool";
  }

  return `${selected[0]?.name ?? "1 tool"} +${selected.length - 1}`;
}

export function IntegrationSelector({
  selectedIntegrationIds,
  onToggleIntegration,
  isSaving = false,
}: IntegrationSelectorProps) {
  const sdk = useSDKClient();
  const [open, setOpen] = useState(false);
  const { data: connections = [] } = useQuery({
    queryKey: ["composio-connections"],
    queryFn: () => sdk.listComposioConnections(),
    staleTime: 15_000,
  });

  const activeConnections = useMemo(
    () =>
      connections
        .filter(
          (connection: ComposioConnection) => connection.status === "active",
        )
        .sort((a, b) =>
          getIntegrationName(a.integrationId, a.integrationName).localeCompare(
            getIntegrationName(b.integrationId, b.integrationName),
          ),
        ),
    [connections],
  );

  const activeById = useMemo(
    () =>
      new Map(
        activeConnections.map((connection) => [
          connection.integrationId,
          connection,
        ]),
      ),
    [activeConnections],
  );

  const selectedIntegrations = useMemo(
    () =>
      selectedIntegrationIds.map((integrationId) => ({
        integrationId,
        name: getIntegrationName(
          integrationId,
          activeById.get(integrationId)?.integrationName,
        ),
        available: activeById.has(integrationId),
      })),
    [activeById, selectedIntegrationIds],
  );

  const availableConnections = activeConnections.filter(
    (connection) => !selectedIntegrationIds.includes(connection.integrationId),
  );
  const unavailableSelected = selectedIntegrations.filter(
    (integration) => !integration.available,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1.5",
            selectedIntegrations.length > 0
              ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plug2 className="h-3.5 w-3.5" />
          )}
          <span className="max-w-[10rem] truncate text-xs font-medium">
            {buildTriggerLabel(selectedIntegrations)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <Command>
          <div className="border-b px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Integrations</p>
                <p className="text-xs text-muted-foreground">This chat only</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {selectedIntegrations.length} selected
              </Badge>
            </div>
          </div>
          <CommandInput placeholder="Search integrations..." />
          <CommandList>
            <CommandEmpty>
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No matching integrations.
              </div>
            </CommandEmpty>

            {selectedIntegrations.length > 0 && (
              <CommandGroup heading="Active in this chat">
                {selectedIntegrations.map((integration) => (
                  <CommandItem
                    key={`selected-${integration.integrationId}`}
                    value={`${integration.integrationId} ${integration.name}`}
                    onSelect={() =>
                      onToggleIntegration(integration.integrationId)
                    }
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4 text-emerald-500" />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{integration.name}</span>
                      {!integration.available && (
                        <span className="text-[10px] uppercase tracking-wide text-amber-500">
                          unavailable
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {unavailableSelected.length > 0 && <CommandSeparator />}

            {availableConnections.length > 0 && (
              <CommandGroup heading="Connected and available">
                {availableConnections.map((connection) => {
                  const name = getIntegrationName(
                    connection.integrationId,
                    connection.integrationName,
                  );

                  return (
                    <CommandItem
                      key={connection._id}
                      value={`${connection.integrationId} ${name}`}
                      onSelect={() =>
                        onToggleIntegration(connection.integrationId)
                      }
                      disabled={isSaving}
                      className="gap-2"
                    >
                      <Plug2 className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {activeConnections.length === 0 &&
              selectedIntegrations.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  <p>No connected integrations yet.</p>
                  <Link
                    href="/settings?tab=integrations"
                    className="mt-2 inline-flex items-center gap-1 text-foreground underline"
                  >
                    <Unplug className="h-3.5 w-3.5" />
                    Manage integrations
                  </Link>
                </div>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
