"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Mail, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useFeatureFlag } from "@/hooks/usePostHogFeatureFlag";

export default function BYODAdminPage() {
  const isBYODEnabled = useFeatureFlag("byod");

  // TODO: Phase G - needs /api/v1/admin/byod/stats REST route
  const { data: stats, isError: isStatsError } = useQuery({
    queryKey: ["admin", "byod", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/byod/stats");
      if (!res.ok)
        throw new Error(`Failed to fetch BYOD stats (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  const { data: instances, isError: isInstancesError } = useQuery({
    queryKey: ["admin", "byod", "instances"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/byod/instances");
      if (!res.ok)
        throw new Error(`Failed to fetch BYOD instances (${res.status})`);
      const json = await res.json();
      return json.data ?? null;
    },
  });

  // Feature flag check
  if (isBYODEnabled === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isBYODEnabled) {
    return (
      <div className="container py-8">
        <div className="text-center py-16">
          <h1 className="text-xl font-bold mb-2">Feature Not Available</h1>
          <p className="text-muted-foreground">
            BYOD management is not enabled for your account.
          </p>
        </div>
      </div>
    );
  }

  const checkAllHealth = async (_args: any) => {
    const res = await fetch("/api/v1/admin/byod/health-check", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();
    return json.data;
  }; // TODO: Phase G

  const runMigrations = async (_args: any) => {
    const res = await fetch("/api/v1/admin/byod/run-migrations", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();
    return json.data;
  }; // TODO: Phase G

  const sendNotifications = async (_args: any) => {
    const res = await fetch("/api/v1/admin/byod/send-notifications", {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();
    return json.data;
  }; // TODO: Phase G

  const { run: handleRefresh, isPending: isRefreshing } = useAsyncAction(
    async () => {
      const result = await checkAllHealth({});
      toast.success(
        `Health check: ${result.healthy} healthy, ${result.unhealthy} unhealthy, ${result.outdated} outdated`,
      );
    },
    { onError: () => toast.error("Health check failed") },
  );

  const { run: handleRunMigrations, isPending: isRunningMigrations } =
    useAsyncAction(
      async () => {
        const result = await runMigrations({});
        toast.success(
          `Migrations: ${result.succeeded} succeeded, ${result.failed} failed`,
        );
      },
      { onError: () => toast.error("Migrations failed") },
    );

  const { run: handleSendNotifications, isPending: isSendingNotifications } =
    useAsyncAction(
      async () => {
        const result = await sendNotifications({});
        toast.success(
          `Emails: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`,
        );
      },
      { onError: () => toast.error("Failed to send notifications") },
    );

  if (isStatsError || isInstancesError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-destructive font-medium">Failed to load BYOD data</p>
        <p className="text-sm text-muted-foreground">
          The admin API endpoints may not be available yet.
        </p>
      </div>
    );
  }

  if (!stats || !instances) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BYOD Management</h1>
          <p className="text-muted-foreground">
            Manage user database instances and migrations (Latest: v
            {stats.latestVersion})
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Check Health
          </Button>
          <Button
            variant="outline"
            onClick={handleSendNotifications}
            disabled={isSendingNotifications || stats.pendingMigrations === 0}
          >
            {isSendingNotifications ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Email Outdated Users
          </Button>
          <Button onClick={handleRunMigrations} disabled={isRunningMigrations}>
            {isRunningMigrations ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Migrations
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">
              Connected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">
              {stats.connected}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.error}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-500">
              Outdated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">
              {stats.pendingMigrations}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Version Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.versionDistribution || {})
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([version, count]: [string, any]) => (
                  <Badge
                    key={version}
                    variant={
                      version === `v${stats.latestVersion}`
                        ? "default"
                        : "secondary"
                    }
                  >
                    {version}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instances</CardTitle>
          <CardDescription>
            All BYOD database instances and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No BYOD instances configured yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance: any) => {
                  const isOutdated =
                    instance.schemaVersion < stats.latestVersion;
                  return (
                    <TableRow key={instance._id}>
                      <TableCell className="font-medium">
                        {instance.userEmail || instance.userId}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={instance.connectionStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>v{instance.schemaVersion}</span>
                          {isOutdated && (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-500/50 text-xs"
                            >
                              outdated
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {instance.lastConnectionTest
                          ? new Date(
                              instance.lastConnectionTest,
                            ).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {instance.connectionError || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return <Badge className="bg-green-500">Connected</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "disconnected":
      return <Badge variant="outline">Disconnected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
