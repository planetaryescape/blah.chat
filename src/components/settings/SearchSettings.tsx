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

export function SearchSettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [hybridSearchEnabled, setHybridSearchEnabled] = useState(false);

  useEffect(() => {
    if (user?.preferences) {
      setHybridSearchEnabled(user.preferences.enableHybridSearch ?? false);
    }
  }, [user]);

  const handleToggleChange = async (checked: boolean) => {
    setHybridSearchEnabled(checked);
    try {
      await updatePreferences({
        preferences: {
          enableHybridSearch: checked,
        },
      });
      toast.success("Search settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
      setHybridSearchEnabled(!checked);
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
        <CardTitle>Search Settings</CardTitle>
        <CardDescription>
          Control how search works across your conversations
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
              semantic understanding for more accurate results
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
