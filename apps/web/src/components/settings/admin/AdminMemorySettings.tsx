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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export function AdminMemorySettings() {
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

  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);
  const [extractInterval, setExtractInterval] = useState(5);

  // Load settings from query
  useEffect(() => {
    if (settings) {
      setAutoExtractEnabled(settings.autoMemoryExtractEnabled ?? true);
      setExtractInterval(settings.autoMemoryExtractInterval ?? 5);
    }
  }, [settings]);

  const handleToggleChange = async (checked: boolean) => {
    setAutoExtractEnabled(checked);
    try {
      await updateSettingsMut.mutateAsync({
        autoMemoryExtractEnabled: checked,
      });
      toast.success(`Memory extraction ${checked ? "enabled" : "disabled"}`);
    } catch (_error) {
      toast.error("Failed to update settings");
      setAutoExtractEnabled(!checked); // Revert on error
    }
  };

  const handleSliderChange = async (value: number[]) => {
    const newInterval = value[0];
    try {
      await updateSettingsMut.mutateAsync({
        autoMemoryExtractInterval: newInterval,
      });
      toast.success(`Extraction interval updated to ${newInterval} messages`);
    } catch (_error) {
      toast.error("Failed to update interval");
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Memory Extraction</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Extraction</CardTitle>
        <CardDescription>
          Global settings for automatic memory extraction from conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-extract">Auto-extract memories</Label>
            <p className="text-sm text-muted-foreground">
              Automatically extract facts from all user conversations
            </p>
          </div>
          <Switch
            id="auto-extract"
            checked={autoExtractEnabled}
            onCheckedChange={handleToggleChange}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Extraction interval</Label>
            <p className="text-sm text-muted-foreground">
              Extract memories every {extractInterval} messages
            </p>
          </div>
          <Slider
            value={[extractInterval]}
            onValueChange={(value) => setExtractInterval(value[0])}
            onValueCommit={handleSliderChange}
            min={3}
            max={20}
            step={1}
            disabled={!autoExtractEnabled}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3 messages</span>
            <span>20 messages</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> These settings apply globally to all users.
            Changes take effect immediately.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
