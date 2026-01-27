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
  ChevronRight,
  Info,
  Loader2,
  Plug2,
  RefreshCw,
  Search,
  X,
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

export function ComposioSettings() {
  const { connections, isLoading, status, connect, disconnect, getConnection } =
    useComposioOAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    IntegrationCategory | "all"
  >("all");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean;
    integration: IntegrationDefinition | null;
  }>({ open: false, integration: null });

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;

    if (activeCategory !== "all") {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [activeCategory, searchQuery]);

  // Active connections
  const activeConnections = useMemo(() => {
    return connections.filter((c: ComposioConnection) => c.status === "active");
  }, [connections]);

  // Connections needing attention
  const needsAttention = useMemo(() => {
    return connections.filter(
      (c: ComposioConnection) =>
        c.status === "expired" || c.status === "failed",
    );
  }, [connections]);

  // Handle connect
  const handleConnect = async (integrationId: string) => {
    setConnectingId(integrationId);
    try {
      await connect(integrationId);
    } finally {
      setConnectingId(null);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (integrationId: string) => {
    await disconnect(integrationId);
    setDisconnectDialog({ open: false, integration: null });
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
            <AlertDescription className="text-sm text-muted-foreground">
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

      {/* Connected integrations */}
      {(activeConnections.length > 0 || needsAttention.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                Connected ({activeConnections.length})
              </CardTitle>
              {needsAttention.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-amber-500 border-amber-500/30"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {needsAttention.length} need attention
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {activeConnections.map((conn: ComposioConnection) => (
                <Badge
                  key={conn._id}
                  variant="secondary"
                  className="py-1.5 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  {conn.integrationName}
                  <button
                    onClick={() => {
                      const integration = INTEGRATIONS.find(
                        (i) => i.id === conn.integrationId,
                      );
                      if (integration) {
                        setDisconnectDialog({ open: true, integration });
                      }
                    }}
                    className="ml-2 hover:text-red-500 transition-colors"
                    title="Disconnect"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {needsAttention.map((conn: ComposioConnection) => (
                <Badge
                  key={conn._id}
                  variant="secondary"
                  className="py-1.5 px-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  onClick={() => handleConnect(conn.integrationId)}
                  title="Click to reconnect"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {conn.integrationName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Available Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Category Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={activeCategory}
              onValueChange={(v) =>
                setActiveCategory(v as IntegrationCategory | "all")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({INTEGRATIONS.length})</SelectItem>
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

          {/* Integration List */}
          {filteredIntegrations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No integrations found matching "{searchQuery}"
            </div>
          ) : (
            <div className="border rounded-lg divide-y overflow-hidden">
              {filteredIntegrations.map((integration) => {
                const connection = getConnection(integration.id);
                const isConnected = connection?.status === "active";
                const isExpired = connection?.status === "expired";
                const isPending = connection?.status === "initiated";
                const isConnecting =
                  connectingId === integration.id || status === "connecting";

                return (
                  <div
                    key={integration.id}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                      isConnected && "bg-emerald-500/5",
                      isExpired && "bg-amber-500/5",
                    )}
                    onClick={() => {
                      if (!isConnecting && !isPending) {
                        if (isConnected) {
                          setDisconnectDialog({ open: true, integration });
                        } else {
                          handleConnect(integration.id);
                        }
                      }
                    }}
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
                        {isConnected && (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        {isExpired && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {integration.description}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="shrink-0">
                      {isConnecting || isPending ? (
                        <Button variant="ghost" size="sm" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </Button>
                      ) : isConnected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() =>
                            setDisconnectDialog({ open: true, integration })
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : isExpired ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-500 hover:text-amber-600"
                          onClick={() => handleConnect(integration.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <AlertDialog
        open={disconnectDialog.open}
        onOpenChange={(open) =>
          setDisconnectDialog({
            open,
            integration: disconnectDialog.integration,
          })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disconnect {disconnectDialog.integration?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to your{" "}
              {disconnectDialog.integration?.name} account. You can reconnect at
              any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectDialog.integration) {
                  handleDisconnect(disconnectDialog.integration.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
