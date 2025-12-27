"use client";

import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BYODConfig } from "./types";

interface ConnectionStatusCardProps {
  config: BYODConfig;
}

export function ConnectionStatusCard({ config }: ConnectionStatusCardProps) {
  const getStatusDisplay = () => {
    switch (config.connectionStatus) {
      case "connected":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: (
            <Badge variant="default" className="bg-green-500">
              Connected
            </Badge>
          ),
          message: "Your database is connected and working.",
        };
      case "pending":
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          badge: <Badge variant="secondary">Pending</Badge>,
          message: "Waiting for connection verification.",
        };
      case "error":
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          badge: <Badge variant="destructive">Error</Badge>,
          message: config.connectionError || "Connection failed.",
        };
      case "disconnected":
        return {
          icon: <XCircle className="h-5 w-5 text-muted-foreground" />,
          badge: <Badge variant="outline">Disconnected</Badge>,
          message: "Database disconnected. Reconnect to use BYOD.",
        };
      default:
        return {
          icon: <Clock className="h-5 w-5" />,
          badge: <Badge variant="outline">Unknown</Badge>,
          message: "Unknown status.",
        };
    }
  };

  const status = getStatusDisplay();
  const lastTest = config.lastConnectionTest
    ? new Date(config.lastConnectionTest).toLocaleString()
    : "Never";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {status.icon}
            Connection Status
          </CardTitle>
          {status.badge}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{status.message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Last checked: {lastTest}
        </p>
      </CardContent>
    </Card>
  );
}
