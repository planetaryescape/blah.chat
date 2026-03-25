"use client";

import { Loader2 } from "lucide-react";
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
import { useUserPreference } from "@/hooks/useUserPreference";
import { useSDKClient } from "@/lib/api/sdkClient";
import { useCurrentUser } from "@/lib/hooks/queries/useCurrentUser";

export function ReasoningSettings() {
  const { data: user } = useCurrentUser();
  const sdk = useSDKClient();

  // Phase 4: Use new preference hook for source of truth
  const prefReasoning = useUserPreference("reasoning");

  // Local state for optimistic updates (initialized from hooks)
  const [showByDefault, setShowByDefault] = useState<boolean>(
    prefReasoning.showByDefault ?? true,
  );
  const [autoExpand, setAutoExpand] = useState<boolean>(
    prefReasoning.autoExpand ?? false,
  );
  const [showDuringStreaming, setShowDuringStreaming] = useState<boolean>(
    prefReasoning.showDuringStreaming ?? true,
  );

  // Sync local state when hook value changes
  useEffect(() => {
    setShowByDefault(prefReasoning.showByDefault ?? true);
    setAutoExpand(prefReasoning.autoExpand ?? false);
    setShowDuringStreaming(prefReasoning.showDuringStreaming ?? true);
  }, [prefReasoning]);

  const handleShowByDefaultChange = async (checked: boolean) => {
    setShowByDefault(checked);
    try {
      await sdk.updatePreference("reasoning", {
        showByDefault: checked,
        autoExpand,
        showDuringStreaming,
      });
      toast.success("Reasoning display settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowByDefault(!checked);
    }
  };

  const handleAutoExpandChange = async (checked: boolean) => {
    setAutoExpand(checked);
    try {
      await sdk.updatePreference("reasoning", {
        showByDefault,
        autoExpand: checked,
        showDuringStreaming,
      });
      toast.success("Reasoning display settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setAutoExpand(!checked);
    }
  };

  const handleShowDuringStreamingChange = async (checked: boolean) => {
    setShowDuringStreaming(checked);
    try {
      await sdk.updatePreference("reasoning", {
        showByDefault,
        autoExpand,
        showDuringStreaming: checked,
      });
      toast.success("Reasoning display settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowDuringStreaming(!checked);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reasoning Display</CardTitle>
        <CardDescription>
          Control how AI thinking and reasoning is displayed in conversations
          with reasoning models (GPT-5, Claude extended thinking, DeepSeek R1)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-reasoning">Show reasoning sections</Label>
            <p className="text-sm text-muted-foreground">
              Display the thinking process when using reasoning models
            </p>
          </div>
          <Switch
            id="show-reasoning"
            checked={showByDefault}
            onCheckedChange={handleShowByDefaultChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-expand">Auto-expand reasoning</Label>
            <p className="text-sm text-muted-foreground">
              Automatically expand reasoning sections instead of keeping them
              collapsed by default
            </p>
          </div>
          <Switch
            id="auto-expand"
            checked={autoExpand}
            onCheckedChange={handleAutoExpandChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-streaming">
              Show reasoning while generating
            </Label>
            <p className="text-sm text-muted-foreground">
              Display reasoning as it streams in real-time during AI response
              generation
            </p>
          </div>
          <Switch
            id="show-streaming"
            checked={showDuringStreaming}
            onCheckedChange={handleShowDuringStreamingChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
