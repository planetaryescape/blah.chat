# Phase 7: Error Handling + Monitoring

## Context

### What is BYOD?

BYOD allows users to store content on their own Convex instance. When their instance is unavailable, we need to handle this gracefully while protecting data integrity.

### Key Decision

**Block until resolved** - When a user's BYOD instance is unreachable, we block the app rather than silently failing or losing data. This is the safest approach for data integrity.

### Where This Phase Fits

```
Phase 1: Foundation ✓
Phase 2: Schema Package ✓
Phase 3: Deployment ✓
Phase 4: DAL Routing ✓
Phase 5: Migrations ✓
Phase 6: Settings UI ✓
         │
         ▼
[Phase 7: Error Handling] ◄── YOU ARE HERE
         │
         ▼
Phase 8: Documentation
```

**Dependencies**: Phase 4 (DAL routing), Phase 6 (settings UI)
**Unlocks**: Full production-ready BYOD

---

## Goal

Implement robust error handling that blocks the app when BYOD connection fails, with clear user feedback and retry mechanisms.

**Pattern**: Use existing `ErrorBoundary.tsx` for React error catching - don't create new one.

---

## Deliverables

### 1. Connection Blocker Component

Create `/src/components/byod/ConnectionBlocker.tsx`:

**Note**: Uses existing `ErrorBoundary.tsx` for React error catching. This component is the BYOD-specific fallback UI.

```typescript
"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useBYOD } from "@/components/providers/byod-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertTriangle, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";

export function ConnectionBlocker({ children }: { children: React.ReactNode }) {
  const { isEnabled, isLoading, config, error } = useBYOD();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const testConnection = useAction(api.byod.testConnection.testConnection);

  // If BYOD not enabled, just render children
  if (!isEnabled) {
    return <>{children}</>;
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Connecting to your database...</p>
        </div>
      </div>
    );
  }

  // If connected, render children
  if (config?.connectionStatus === "connected") {
    return <>{children}</>;
  }

  // Connection error - block UI
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await testConnection({});
      setRetryCount((c) => c + 1);
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle>Database Connection Error</CardTitle>
          </div>
          <CardDescription>
            Unable to connect to your Convex database. The app is blocked to
            protect your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Possible causes:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Your Convex project is paused or deleted</li>
              <li>Deploy key has expired or been revoked</li>
              <li>Network connectivity issues</li>
              <li>Convex service outage</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRetrying ? "Retrying..." : "Retry Connection"}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/settings?section=database">
                <Settings className="h-4 w-4 mr-2" />
                Check Settings
              </Link>
            </Button>

            <Button variant="ghost" asChild className="w-full">
              <a
                href="https://dashboard.convex.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Convex Dashboard
              </a>
            </Button>
          </div>

          {retryCount > 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Still having issues? Try updating your credentials in Settings or
              contact support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. Health Check Action

**Note**: No new ErrorBoundary needed - use existing `/src/components/ErrorBoundary.tsx` with BYOD-specific error detection.

Create `/convex/byod/healthCheck.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { decryptCredential } from "../lib/encryption";

// Check health of a single user's instance
export const checkUserHealth = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(
      internal.byod.credentials.getConfigInternal,
      { userId: args.userId }
    );

    if (!config || config.connectionStatus !== "connected") {
      return { healthy: true, reason: "not_connected" };
    }

    try {
      // Decrypt credentials
      const [urlIv, keyIv] = config.encryptionIV.split(":");
      const [urlAuthTag, keyAuthTag] = config.authTags.split(":");

      const deploymentUrl = await decryptCredential(
        config.encryptedDeploymentUrl,
        urlIv,
        urlAuthTag
      );

      const deployKey = await decryptCredential(
        config.encryptedDeployKey,
        keyIv,
        keyAuthTag
      );

      // Test connection
      const client = new ConvexHttpClient(deploymentUrl);
      client.setAdminAuth(deployKey);

      await client.query(api.functions.ping);

      // Update last connection test
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: config._id,
        lastConnectionTest: Date.now(),
        connectionError: undefined,
        updatedAt: Date.now(),
      });

      return { healthy: true, reason: "connected" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update status to error
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: config._id,
        connectionStatus: "error",
        connectionError: errorMessage,
        lastConnectionTest: Date.now(),
        updatedAt: Date.now(),
      });

      return { healthy: false, reason: errorMessage };
    }
  },
});

// Check all BYOD instances (scheduled job)
export const checkAllHealth = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all connected configs
    const configs = await ctx.runQuery(
      internal.byod.healthCheck.getConnectedConfigs
    );

    const results = {
      total: configs.length,
      healthy: 0,
      unhealthy: 0,
      errors: [] as { userId: string; error: string }[],
    };

    for (const config of configs) {
      const result = await ctx.runAction(
        internal.byod.healthCheck.checkUserHealth,
        { userId: config.userId }
      );

      if (result.healthy) {
        results.healthy++;
      } else {
        results.unhealthy++;
        results.errors.push({
          userId: config.userId,
          error: result.reason,
        });
      }
    }

    // Send alerts if needed
    if (results.unhealthy > 0) {
      await ctx.runAction(internal.byod.healthCheck.sendHealthAlerts, {
        unhealthyCount: results.unhealthy,
        errors: results.errors,
      });
    }

    return results;
  },
});

// Query for connected configs
export const getConnectedConfigs = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_status", (q) => q.eq("connectionStatus", "connected"))
      .collect();
  },
});

// Send health alerts (email notification)
export const sendHealthAlerts = internalAction({
  args: {
    unhealthyCount: v.number(),
    errors: v.array(v.object({
      userId: v.string(),
      error: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Get admin email from settings
    const settings = await ctx.runQuery(internal.adminSettings.get);
    if (!settings?.alertEmail) return;

    // Send email using existing email system
    await ctx.runAction(internal.emails.sendEmail, {
      to: settings.alertEmail,
      subject: `[blah.chat] BYOD Health Alert: ${args.unhealthyCount} instances unhealthy`,
      body: `
        ${args.unhealthyCount} BYOD instances are currently unhealthy.

        Details:
        ${args.errors.map((e) => `- User ${e.userId}: ${e.error}`).join("\n")}

        Please check the admin dashboard for more details.
      `,
    });
  },
});
```

### 3. Scheduled Health Check

Add to `/convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check BYOD health every 5 minutes
crons.interval(
  "byod-health-check",
  { minutes: 5 },
  internal.byod.healthCheck.checkAllHealth
);

export default crons;
```

### 4. Admin Dashboard

Create `/src/app/(main)/admin/byod/page.tsx`:

```typescript
"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Play } from "lucide-react";
import { useState } from "react";

export default function BYODAdminPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningMigrations, setIsRunningMigrations] = useState(false);

  const stats = useQuery(api.admin.byod.getStats);
  const instances = useQuery(api.admin.byod.listInstances);

  const checkAllHealth = useAction(api.byod.healthCheck.checkAllHealth);
  const runMigrations = useAction(api.byod.migrationRunner.runMigrationsForAll);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkAllHealth({});
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunMigrations = async () => {
    setIsRunningMigrations(true);
    try {
      const result = await runMigrations({});
      alert(`Migrations complete: ${result.succeeded} succeeded, ${result.failed} failed`);
    } finally {
      setIsRunningMigrations(false);
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
        <h1 className="text-2xl font-bold">BYOD Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Check Health
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
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Instances</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{stats.connected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{stats.error}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Migrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingMigrations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Instances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schema Version</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((instance) => (
                <TableRow key={instance._id}>
                  <TableCell>{instance.userEmail || instance.userId}</TableCell>
                  <TableCell>
                    <StatusBadge status={instance.connectionStatus} />
                  </TableCell>
                  <TableCell>v{instance.schemaVersion}</TableCell>
                  <TableCell>
                    {instance.lastConnectionTest
                      ? new Date(instance.lastConnectionTest).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {instance.connectionError || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/src/components/byod/ConnectionBlocker.tsx` | Create | Blocking error UI (BYOD-specific fallback) |
| `/convex/byod/healthCheck.ts` | Create | Health check actions |
| `/convex/crons.ts` | Modify | Add health check cron |
| `/src/app/(main)/admin/byod/page.tsx` | Create | Admin dashboard |
| `/convex/admin/byod.ts` | Create | Admin queries |

**Note**: NO new ErrorBoundary - use existing `/src/components/ErrorBoundary.tsx`. ConnectionBlocker is the BYOD-specific fallback UI.

---

## Testing Criteria

- [ ] Connection blocker shows when BYOD instance unreachable
- [ ] Retry button works and updates status
- [ ] Error boundary catches BYOD errors
- [ ] Health check runs on schedule
- [ ] Admin gets email on failures
- [ ] Admin dashboard shows all instances
- [ ] Batch operations work from admin

---

## Next Phase

After completing Phase 7, proceed to [Phase 8: Documentation](./phase-8-documentation.md) to create user and developer documentation.
