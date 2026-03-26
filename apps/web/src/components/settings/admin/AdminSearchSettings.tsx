"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function AdminSearchSettings() {
  // TODO: Phase G - needs /api/v1/admin/settings REST route
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/settings");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    },
  });

  const updateSettingsMut = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

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
      await updateSettingsMut.mutateAsync({ enableHybridSearch: checked });
      toast.success(`Hybrid search ${checked ? "enabled" : "disabled"}`);
    } catch (_error) {
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
