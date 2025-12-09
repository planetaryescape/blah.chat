"use client";

import { Button } from "@/components/ui/button";
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
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function UISettings() {
  // @ts-ignore - Convex type instantiation depth issue
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);
  const resetOnboarding = useMutation(api.onboarding.resetOnboarding);

  const [alwaysShowMessageActions, setAlwaysShowMessageActions] =
    useState(false);
  const [showModelNamesDuringComparison, setShowModelNamesDuringComparison] =
    useState(false);

  // Reasoning display settings
  const [showByDefault, setShowByDefault] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);
  const [showDuringStreaming, setShowDuringStreaming] = useState(true);

  useEffect(() => {
    if (user?.preferences) {
      setAlwaysShowMessageActions(
        user.preferences.alwaysShowMessageActions ?? false,
      );
      setShowModelNamesDuringComparison(
        user.preferences.showModelNamesDuringComparison ?? false,
      );

      // Initialize reasoning settings
      if (user.preferences.reasoning) {
        setShowByDefault(user.preferences.reasoning.showByDefault ?? true);
        setAutoExpand(user.preferences.reasoning.autoExpand ?? false);
        setShowDuringStreaming(user.preferences.reasoning.showDuringStreaming ?? true);
      }
    }
  }, [user]);

  const handleAlwaysShowActionsChange = async (checked: boolean) => {
    setAlwaysShowMessageActions(checked);
    try {
      await updatePreferences({
        preferences: {
          alwaysShowMessageActions: checked,
        },
      });
      toast.success("UI settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setAlwaysShowMessageActions(!checked);
    }
  };

  const handleShowModelNamesChange = async (checked: boolean) => {
    setShowModelNamesDuringComparison(checked);
    try {
      await updatePreferences({
        preferences: {
          showModelNamesDuringComparison: checked,
        } as any,
      });
      toast.success("UI settings saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowModelNamesDuringComparison(!checked);
    }
  };

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
      toast.success("Reasoning settings saved!");
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
      toast.success("Reasoning settings saved!");
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
      toast.success("Reasoning settings saved!");
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
        <CardTitle>UI Settings</CardTitle>
        <CardDescription>
          Customize the appearance and behavior of the interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="always-show-actions">
              Always show message actions
            </Label>
            <p className="text-sm text-muted-foreground">
              Show copy, regenerate, branch, and delete buttons on all messages
              instead of only on hover
            </p>
          </div>
          <Switch
            id="always-show-actions"
            checked={alwaysShowMessageActions}
            onCheckedChange={handleAlwaysShowActionsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="always-show-actions">
              Always show message actions
            </Label>
            <p className="text-sm text-muted-foreground">
              Show copy, regenerate, branch, and delete buttons on all messages
              instead of only on hover
            </p>
          </div>
          <Switch
            id="always-show-actions"
            checked={alwaysShowMessageActions}
            onCheckedChange={handleAlwaysShowActionsChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-model-names">
              Show model names during comparison
            </Label>
            <p className="text-sm text-muted-foreground">
              Display model identities immediately (enabled) or hide until after
              voting (disabled) for unbiased comparison
            </p>
          </div>
          <Switch
            id="show-model-names"
            checked={showModelNamesDuringComparison}
            onCheckedChange={handleShowModelNamesChange}
          />
        </div>

        <div className="border-t pt-4 space-y-4">
            <div className="space-y-1">
                <h3 className="font-medium">Reasoning Display</h3>
                <p className="text-sm text-muted-foreground">
                    Control how AI thinking is displayed for reasoning models (o1/o3, DeepSeek R1)
                </p>
            </div>

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
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label>Onboarding Tour</Label>
            <p className="text-sm text-muted-foreground">
              Restart the first-time user walkthrough
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await resetOnboarding();
                toast.success("Tour reset! Reload to see it again.");
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              } catch (error) {
                toast.error("Failed to reset tour");
              }
            }}
          >
            Restart Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
