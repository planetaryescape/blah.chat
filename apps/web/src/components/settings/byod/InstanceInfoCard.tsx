"use client";

import { AlertTriangle, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BYODConfig } from "./types";

interface InstanceInfoCardProps {
  config: BYODConfig;
}

function getMigrationBadge(status: string) {
  switch (status) {
    case "up_to_date":
      return (
        <Badge variant="outline" className="text-green-600 border-green-500/50">
          Up to date
        </Badge>
      );
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "running":
      return (
        <Badge variant="secondary" className="animate-pulse">
          Running
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function InstanceInfoCard({ config }: InstanceInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Instance Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {config.migrationStatus === "failed" && config.migrationError && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              Migration failed: {config.migrationError}
            </AlertDescription>
          </Alert>
        )}

        {config.neonProjectId && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Neon Project</span>
            <span className="font-mono text-xs">{config.neonProjectId}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Schema Version</span>
          <span className="font-medium">v{config.schemaVersion}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Migration Status</span>
          {getMigrationBadge(config.migrationStatus)}
        </div>

        {config.lastMigrationAt && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Migration</span>
            <span className="font-medium">
              {new Date(config.lastMigrationAt).toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
