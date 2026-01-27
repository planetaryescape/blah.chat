"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  type IntegrationCategory,
  type IntegrationDefinition,
} from "@blah-chat/backend/convex/composio/constants";
import {
  AlertTriangle,
  Check,
  Clock,
  Info,
  Loader2,
  Plug2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { IntegrationIcon } from "@/components/settings/composio/IntegrationIcon";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComposioOAuth } from "@/hooks/useComposioOAuth";
import { cn } from "@/lib/utils";

type ComposioConnection = Doc<"composioConnections">;
type StatusFilter = "all" | "connected" | "needs_attention";

export function ComposioSettings() {
  const { connections, isLoading, connect, disconnect, getConnection } =
    useComposioOAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    IntegrationCategory | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    integration: IntegrationDefinition | null;
    action: "disconnect" | "cancel";
  }>({ open: false, integration: null, action: "disconnect" });

  // Active connections
  const activeConnections = useMemo(() => {
    return connections.filter((c: ComposioConnection) => c.status === "active");
  }, [connections]);

  // Pending connections
  const pendingConnections = useMemo(() => {
    return connections.filter(
      (c: ComposioConnection) => c.status === "initiated",
    );
  }, [connections]);

  // Connections needing attention (expired/failed)
  const needsAttention = useMemo(() => {
    return connections.filter(
      (c: ComposioConnection) =>
        c.status === "expired" || c.status === "failed",
    );
  }, [connections]);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;

    // Category filter
    if (activeCategory !== "all") {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }

    // Status filter
    if (statusFilter === "connected") {
      const connectedIds = new Set(
        activeConnections.map((c: ComposioConnection) => c.integrationId),
      );
      filtered = filtered.filter((i) => connectedIds.has(i.id));
    } else if (statusFilter === "needs_attention") {
      const attentionIds = new Set([
        ...needsAttention.map((c: ComposioConnection) => c.integrationId),
        ...pendingConnections.map((c: ComposioConnection) => c.integrationId),
      ]);
      filtered = filtered.filter((i) => attentionIds.has(i.id));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [
    activeCategory,
    statusFilter,
    searchQuery,
    activeConnections,
    needsAttention,
    pendingConnections,
  ]);

  // Handle connect
  const handleConnect = async (integrationId: string) => {
    setConnectingId(integrationId);
    try {
      await connect(integrationId);
    } finally {
      setConnectingId(null);
    }
  };

  // Handle disconnect/cancel
  const handleDisconnect = async (integrationId: string) => {
    await disconnect(integrationId);
    setDisconnectDialog({
      open: false,
      integration: null,
      action: "disconnect",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Integrations</CardTitle>
          </div>
          <CardDescription>
            Connect your favorite tools to enhance AI capabilities. The AI will
            be able to interact with connected services during conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert className="bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm text-muted-foreground block">
              Integrations are powered by{" "}
              <a
                href="https://composio.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Composio
              </a>
              . When connecting, you&apos;ll grant permission to
              &quot;Composio&quot; on the OAuth consent screen. This is expected
              and secure &mdash; Composio acts as the integration layer to
              securely access your accounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Integrations Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Integrations</CardTitle>
            {activeConnections.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              >
                <Check className="h-3 w-3 mr-1" />
                {activeConnections.length} connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="connected">
                    Connected ({activeConnections.length})
                  </SelectItem>
                  <SelectItem value="needs_attention">
                    Needs Attention (
                    {needsAttention.length + pendingConnections.length})
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={activeCategory}
                onValueChange={(v) =>
                  setActiveCategory(v as IntegrationCategory | "all")
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(INTEGRATION_CATEGORIES)
                    .sort((a, b) => a[1].order - b[1].order)
                    .map(([id, { label }]) => {
                      const count = INTEGRATIONS.filter(
                        (i) => i.category === id,
                      ).length;
                      return (
                        <SelectItem key={id} value={id}>
                          {label} ({count})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Integration List - ScrollArea for 500+ items */}
          {filteredIntegrations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {statusFilter === "connected" &&
              activeConnections.length === 0 ? (
                "No connected integrations yet"
              ) : statusFilter === "needs_attention" &&
                needsAttention.length === 0 &&
                pendingConnections.length === 0 ? (
                "No integrations need attention"
              ) : searchQuery ? (
                <>No integrations found matching &quot;{searchQuery}&quot;</>
              ) : (
                "No integrations found"
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="divide-y">
                {filteredIntegrations.map((integration) => {
                  const connection = getConnection(integration.id);
                  const isConnected = connection?.status === "active";
                  const isExpired = connection?.status === "expired";
                  const isFailed = connection?.status === "failed";
                  const isPending = connection?.status === "initiated";
                  const isConnecting = connectingId === integration.id;

                  return (
                    <div
                      key={integration.id}
                      className={cn(
                        "flex items-center gap-3 p-3 transition-colors",
                        isConnected && "bg-emerald-500/5",
                        (isExpired || isFailed) && "bg-amber-500/5",
                        isPending && "bg-blue-500/5",
                      )}
                    >
                      {/* Icon */}
                      <IntegrationIcon
                        integrationId={integration.id}
                        integrationName={integration.name}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {integration.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {integration.description}
                        </p>
                      </div>

                      {/* Status & Action */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isConnecting ? (
                          <Button variant="outline" size="sm" disabled>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Connecting...
                          </Button>
                        ) : isPending ? (
                          <>
                            <Badge
                              variant="secondary"
                              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDisconnectDialog({
                                  open: true,
                                  integration,
                                  action: "cancel",
                                })
                              }
                            >
                              Cancel
                            </Button>
                          </>
                        ) : isConnected ? (
                          <>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConnect(integration.id)}
                            >
                              Manage
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setDisconnectDialog({
                                  open: true,
                                  integration,
                                  action: "disconnect",
                                })
                              }
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : isExpired || isFailed ? (
                          <>
                            <Badge
                              variant="secondary"
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {isExpired ? "Expired" : "Failed"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConnect(integration.id)}
                            >
                              Reconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(integration.id)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Disconnect/Cancel confirmation dialog */}
      <AlertDialog
        open={disconnectDialog.open}
        onOpenChange={(open) =>
          setDisconnectDialog({
            open,
            integration: disconnectDialog.integration,
            action: disconnectDialog.action,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {disconnectDialog.action === "cancel"
                ? `Cancel ${disconnectDialog.integration?.name} connection?`
                : `Disconnect ${disconnectDialog.integration?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectDialog.action === "cancel"
                ? `This will cancel the pending connection to ${disconnectDialog.integration?.name}. You can try connecting again later.`
                : `This will revoke access to your ${disconnectDialog.integration?.name} account. You can reconnect at any time.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectDialog.integration) {
                  handleDisconnect(disconnectDialog.integration.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              {disconnectDialog.action === "cancel"
                ? "Cancel Connection"
                : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
