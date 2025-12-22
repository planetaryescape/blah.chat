"use client";

import { AlertTriangle, Database, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadBYODProject } from "@/lib/byod/downloadProject";
import { BYOD_SCHEMA_VERSION } from "@/lib/byod/version";
import type { BYODConfig } from "./types";

interface InstanceInfoCardProps {
  config: BYODConfig;
}

export function InstanceInfoCard({ config }: InstanceInfoCardProps) {
  const isOutdated = config.schemaVersion < BYOD_SCHEMA_VERSION;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Instance Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Update Required Banner */}
        {isOutdated && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <span className="font-medium">Update available!</span> Your
              database is on v{config.schemaVersion}, latest is v
              {BYOD_SCHEMA_VERSION}.{" "}
              <a href="#update-instructions" className="underline">
                See update instructions
              </a>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Schema Version</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">v{config.schemaVersion}</span>
            {isOutdated && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-500/50"
              >
                → v{BYOD_SCHEMA_VERSION}
              </Badge>
            )}
            {!isOutdated && config.schemaVersion > 0 && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-500/50"
              >
                Latest
              </Badge>
            )}
          </div>
        </div>
        {config.lastSchemaDeploy && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Deployed</span>
            <span className="font-medium">
              {new Date(config.lastSchemaDeploy).toLocaleString()}
            </span>
          </div>
        )}
        {config.deploymentStatus && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deployment Status</span>
            <Badge
              variant={
                config.deploymentStatus === "deployed" ? "default" : "secondary"
              }
            >
              {config.deploymentStatus}
            </Badge>
          </div>
        )}

        {/* Update Instructions (shown when outdated) */}
        {isOutdated && (
          <div id="update-instructions" className="pt-3 border-t">
            <p className="text-sm font-medium mb-2">How to update:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Download the new schema package below</li>
              <li>
                Unzip and run{" "}
                <code className="px-1 py-0.5 rounded bg-muted font-mono text-xs">
                  bunx convex deploy
                </code>
              </li>
              <li>Refresh this page to verify</li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => downloadBYODProject()}
            >
              <Download className="h-4 w-4" />
              Download v{BYOD_SCHEMA_VERSION} Package
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
