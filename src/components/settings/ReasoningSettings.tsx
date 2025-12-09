"use client";

import { useMutation, useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";

export function ReasoningSettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [showByDefault, setShowByDefault] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);
  const [showDuringStreaming, setShowDuringStreaming] = useState(true);

  useEffect(() => {
    if (user?.preferences?.reasoning) {
      setShowByDefault(user.preferences.reasoning.showByDefault ?? true);
      setAutoExpand(user.preferences.reasoning.autoExpand ?? false);
      setShowDuringStreaming(
        user.preferences.reasoning.showDuringStreaming ?? true,
      );
    }
  }, [user]);

  const handleShowByDefaultChange = async (checked: boolean) => {
    setShowByDefault(checked);
    try {
      await updatePreferences({
        preferences: {
          reasoning: {
            showByDefault: checked,
            autoExpand,
            showDuringStreaming,
          },
        } as any,
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
      await updatePreferences({
        preferences: {
          reasoning: {
            showByDefault,
            autoExpand: checked,
            showDuringStreaming,
          },
        } as any,
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
      await updatePreferences({
        preferences: {
          reasoning: {
            showByDefault,
            autoExpand,
            showDuringStreaming: checked,
          },
        } as any,
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
          with reasoning models (OpenAI o1/o3, Claude extended thinking,
          DeepSeek R1)
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
