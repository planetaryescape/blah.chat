"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlag } from "@/hooks/usePostHogFeatureFlag";
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
import { Loader2, Mail, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function BYODAdminPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningMigrations, setIsRunningMigrations] = useState(false);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const isBYODEnabled = useFeatureFlag("byod");

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const stats = useQuery(api.admin.byod.getStats);
  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const instances = useQuery(api.admin.byod.listInstances);

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

  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const checkAllHealth = useAction(api.byod.healthCheck.checkAllHealth);
  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const runMigrations = useAction(api.byod.migrationRunner.runMigrationsForAll);
  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const sendNotifications = useAction(api.admin.byod.sendUpdateNotifications);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await checkAllHealth({});
      toast.success(
        `Health check: ${result.healthy} healthy, ${result.unhealthy} unhealthy, ${result.outdated} outdated`,
      );
    } catch (error) {
      toast.error("Health check failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunMigrations = async () => {
    setIsRunningMigrations(true);
    try {
      const result = await runMigrations({});
      toast.success(
        `Migrations: ${result.succeeded} succeeded, ${result.failed} failed`,
      );
    } catch (error) {
      toast.error("Migrations failed");
    } finally {
      setIsRunningMigrations(false);
    }
  };

  const handleSendNotifications = async () => {
    setIsSendingNotifications(true);
    try {
      const result = await sendNotifications({});
      toast.success(
        `Emails: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`,
      );
    } catch (error) {
      toast.error("Failed to send notifications");
    } finally {
      setIsSendingNotifications(false);
    }
  };

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
                .map(([version, count]) => (
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
                {instances.map((instance) => {
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
