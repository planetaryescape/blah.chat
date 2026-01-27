"use client";

import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATIONS,
  type IntegrationCategory,
} from "@blah-chat/backend/convex/composio/constants";
import { AlertTriangle, Check, Loader2, Plug2, Search, X } from "lucide-react";

type ComposioConnection = Doc<"composioConnections">;

import { useMemo, useState } from "react";
import { IntegrationCard } from "@/components/settings/composio/IntegrationCard";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useComposioOAuth } from "@/hooks/useComposioOAuth";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

export function ComposioSettings() {
  const { connections, isLoading, status, connect, disconnect, getConnection } =
    useComposioOAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    IntegrationCategory | "all"
  >("all");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;

    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter((i) => i.category === activeCategory);
    }

    // Filter by search
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

  // Connections needing attention (expired or failed)
  const needsAttention = useMemo(() => {
    return connections.filter(
      (c: ComposioConnection) =>
        c.status === "expired" || c.status === "failed",
    );
  }, [connections]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: INTEGRATIONS.length };
    for (const integration of INTEGRATIONS) {
      counts[integration.category] = (counts[integration.category] || 0) + 1;
    }
    return counts;
  }, []);

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
  };

  // Handle refresh (reconnect expired)
  const handleRefresh = async (integrationId: string) => {
    await handleConnect(integrationId);
  };

  // Load more
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
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
      </Card>

      {/* Connected integrations strip */}
      {(activeConnections.length > 0 || needsAttention.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
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
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activeConnections.map((conn: ComposioConnection) => (
                <Badge
                  key={conn._id}
                  variant="secondary"
                  className="py-1.5 px-3 bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                >
                  {conn.integrationName}
                  <button
                    onClick={() => handleDisconnect(conn.integrationId)}
                    className="ml-2 hover:text-red-500"
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
                  className="py-1.5 px-3 bg-amber-500/10 text-amber-500 border-amber-500/20 cursor-pointer"
                  onClick={() => handleRefresh(conn.integrationId)}
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
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(ITEMS_PER_PAGE);
            }}
            className="pl-9"
          />
        </div>

        {/* Category tabs */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveCategory("all");
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className="shrink-0"
            >
              All
              <Badge
                variant="secondary"
                className={cn(
                  "ml-2 h-5 px-1.5",
                  activeCategory === "all" && "bg-primary-foreground/20",
                )}
              >
                {categoryCounts.all}
              </Badge>
            </Button>
            {Object.entries(INTEGRATION_CATEGORIES)
              .sort((a, b) => a[1].order - b[1].order)
              .map(([id, { label }]) => (
                <Button
                  key={id}
                  variant={activeCategory === id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveCategory(id as IntegrationCategory);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  className="shrink-0"
                >
                  {label}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-2 h-5 px-1.5",
                      activeCategory === id && "bg-primary-foreground/20",
                    )}
                  >
                    {categoryCounts[id] || 0}
                  </Badge>
                </Button>
              ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredIntegrations.slice(0, visibleCount).map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connection={getConnection(integration.id)}
            onConnect={() => handleConnect(integration.id)}
            onDisconnect={() => handleDisconnect(integration.id)}
            onRefresh={() => handleRefresh(integration.id)}
            isConnecting={
              connectingId === integration.id || status === "connecting"
            }
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredIntegrations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No integrations found matching &quot;{searchQuery}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Load more */}
      {visibleCount < filteredIntegrations.length && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More ({filteredIntegrations.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
