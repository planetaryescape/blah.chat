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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";

export function AdminMemorySettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const settings = useQuery(api.adminSettings.get);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateSettings = useMutation(api.adminSettings.update);

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
      await updateSettings({ autoMemoryExtractEnabled: checked });
      toast.success(`Memory extraction ${checked ? "enabled" : "disabled"}`);
    } catch (_error) {
      toast.error("Failed to update settings");
      setAutoExtractEnabled(!checked); // Revert on error
    }
  };

  const handleSliderChange = async (value: number[]) => {
    const newInterval = value[0];
    try {
      await updateSettings({ autoMemoryExtractInterval: newInterval });
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
