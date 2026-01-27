"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import type { IntegrationDefinition } from "@blah-chat/backend/convex/composio/constants";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IntegrationCardProps {
  integration: IntegrationDefinition;
  connection?: Doc<"composioConnections">;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh?: () => void;
  isConnecting?: boolean;
}

export function IntegrationCard({
  integration,
  connection,
  onConnect,
  onDisconnect,
  onRefresh,
  isConnecting,
}: IntegrationCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const isConnected = connection?.status === "active";
  const isExpired = connection?.status === "expired";
  const isPending = connection?.status === "initiated";
  const hasFailed = connection?.status === "failed";

  const getStatusBadge = () => {
    if (isConnecting || isPending) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Connecting...
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-500">
          <Check className="h-3 w-3" />
          Connected
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500">
          <AlertTriangle className="h-3 w-3" />
          Needs reauth
        </span>
      );
    }
    if (hasFailed) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <AlertTriangle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    return null;
  };

  const handleAction = () => {
    if (isConnected) {
      setShowDisconnectDialog(true);
    } else if (isExpired && onRefresh) {
      onRefresh();
    } else {
      onConnect();
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col gap-3 p-4 rounded-lg border transition-all",
          isConnected && "border-emerald-500/30 bg-emerald-500/5",
          isExpired && "border-amber-500/30 bg-amber-500/5",
          hasFailed && "border-red-500/30 bg-red-500/5",
          !connection && "border-border/50 hover:border-border",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Icon placeholder - could add real icons later */}
            <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-lg font-semibold text-muted-foreground">
              {integration.name.slice(0, 2)}
            </div>
            <div>
              <h3 className="font-medium text-sm">{integration.name}</h3>
              <p className="text-xs text-muted-foreground">
                {integration.description}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {/* Action Button */}
        <Button
          variant={isConnected ? "outline" : "secondary"}
          size="sm"
          onClick={handleAction}
          disabled={isConnecting || isPending}
          className={cn(
            "w-full",
            isConnected &&
              "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10",
            isExpired &&
              "border-amber-500/30 text-amber-500 hover:bg-amber-500/10",
          )}
        >
          {isConnecting || isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : isConnected ? (
            "Disconnect"
          ) : isExpired ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect
            </>
          )}
        </Button>

        {/* Error message */}
        {connection?.lastError && (
          <p
            className="text-xs text-red-500 truncate"
            title={connection.lastError}
          >
            {connection.lastError}
          </p>
        )}
      </div>

      {/* Disconnect confirmation dialog */}
      <AlertDialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {integration.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to your {integration.name} account. You
              can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDisconnect();
                setShowDisconnectDialog(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
