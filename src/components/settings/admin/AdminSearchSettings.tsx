"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";

export function AdminSearchSettings() {
  const settings = useQuery(api.adminSettings.get);
  const updateSettings = useMutation(api.adminSettings.update);

  const [hybridSearchEnabled, setHybridSearchEnabled] = useState(false);

  // Load settings from query
  useEffect(() => {
    if (settings) {
      setHybridSearchEnabled(settings.enableHybridSearch ?? false);
    }
  }, [settings]);

  const handleToggleChange = async (checked: boolean) => {
    setHybridSearchEnabled(checked);
    try {
      await updateSettings({ enableHybridSearch: checked });
      toast.success("Hybrid search " + (checked ? "enabled" : "disabled"));
    } catch (error) {
      toast.error("Failed to update settings");
      setHybridSearchEnabled(!checked); // Revert on error
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Settings</CardTitle>
        <CardDescription>
          Control how search works across all users' conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="hybrid-search">Enable hybrid search</Label>
            <p className="text-sm text-muted-foreground">
              Combine keyword and semantic search for better results
            </p>
          </div>
          <Switch
            id="hybrid-search"
            checked={hybridSearchEnabled}
            onCheckedChange={handleToggleChange}
          />
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium">Search modes:</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>
              <strong>Full-text only (default):</strong> Fast keyword-based
              search
            </li>
            <li>
              <strong>Hybrid search:</strong> Combines keywords with AI-powered
              semantic understanding for more accurate results (slower, uses
              embeddings)
            </li>
          </ul>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This setting applies globally to all users.
            Hybrid search requires message embeddings and will use additional
            API quota.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
