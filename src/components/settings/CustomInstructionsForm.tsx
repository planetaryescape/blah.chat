"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CustomInstructionsForm() {
  const user = useQuery(api.users.getCurrentUser);
  const updateCustomInstructions = useMutation(api.users.updateCustomInstructions);

  const [aboutUser, setAboutUser] = useState("");
  const [responseStyle, setResponseStyle] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing settings
  useEffect(() => {
    if (user?.preferences?.customInstructions) {
      setAboutUser(user.preferences.customInstructions.aboutUser || "");
      setResponseStyle(user.preferences.customInstructions.responseStyle || "");
      setEnabled(user.preferences.customInstructions.enabled ?? true);
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateCustomInstructions({
        aboutUser,
        responseStyle,
        enabled,
      });
      toast.success("Custom instructions saved!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
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
        <CardTitle>Custom Instructions</CardTitle>
        <CardDescription>
          Personalize how AI responds to you across all conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="about-user">What would you like AI to know about you?</Label>
          <Textarea
            id="about-user"
            value={aboutUser}
            onChange={(e) => setAboutUser(e.target.value)}
            placeholder="e.g., I'm a software engineer working on web apps. I prefer TypeScript and React. I'm learning French."
            maxLength={3000}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {aboutUser.length}/3000 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="response-style">How should AI respond?</Label>
          <Textarea
            id="response-style"
            value={responseStyle}
            onChange={(e) => setResponseStyle(e.target.value)}
            placeholder="e.g., Be concise and direct. Use code examples. Explain trade-offs."
            maxLength={3000}
            rows={6}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {responseStyle.length}/3000 characters
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
          <Label htmlFor="enabled" className="cursor-pointer">
            Enable custom instructions
          </Label>
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
