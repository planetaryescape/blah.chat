"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UISettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [alwaysShowMessageActions, setAlwaysShowMessageActions] =
    useState(false);

  useEffect(() => {
    if (user?.preferences) {
      setAlwaysShowMessageActions(
        user.preferences.alwaysShowMessageActions ?? false,
      );
    }
  }, [user]);

  const handleToggleChange = async (checked: boolean) => {
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
            onCheckedChange={handleToggleChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
