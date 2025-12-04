"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MemorySettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [autoExtractEnabled, setAutoExtractEnabled] = useState(true);
  const [extractInterval, setExtractInterval] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.preferences) {
      setAutoExtractEnabled(user.preferences.autoMemoryExtractEnabled ?? true);
      setExtractInterval(user.preferences.autoMemoryExtractInterval ?? 5);
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updatePreferences({
        preferences: {
          autoMemoryExtractEnabled: autoExtractEnabled,
          autoMemoryExtractInterval: extractInterval,
        },
      });
      toast.success("Memory settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
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
        <CardTitle>Memory Settings</CardTitle>
        <CardDescription>
          Control how AI extracts and remembers facts from conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-extract">Auto-extract memories</Label>
            <p className="text-sm text-muted-foreground">
              Automatically extract facts from conversations
            </p>
          </div>
          <Switch
            id="auto-extract"
            checked={autoExtractEnabled}
            onCheckedChange={setAutoExtractEnabled}
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

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm">
            <strong>How it works:</strong> AI analyzes your conversations and extracts memorable facts
            like preferences, project details, and context. These memories help AI provide more
            personalized responses.
          </p>
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
