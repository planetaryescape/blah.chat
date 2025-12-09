"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";

type BaseStyleAndTone =
  | "default"
  | "professional"
  | "friendly"
  | "candid"
  | "quirky"
  | "efficient"
  | "nerdy"
  | "cynical";

const STYLE_OPTIONS: {
  value: BaseStyleAndTone;
  label: string;
  description: string;
}[] = [
  { value: "default", label: "Default", description: "Preset style and tone" },
  {
    value: "professional",
    label: "Professional",
    description: "Polished and precise",
  },
  { value: "friendly", label: "Friendly", description: "Warm and chatty" },
  {
    value: "candid",
    label: "Candid",
    description: "Direct and encouraging",
  },
  {
    value: "quirky",
    label: "Quirky",
    description: "Playful and imaginative",
  },
  {
    value: "efficient",
    label: "Efficient",
    description: "Concise and plain",
  },
  {
    value: "nerdy",
    label: "Nerdy",
    description: "Exploratory and enthusiastic",
  },
  {
    value: "cynical",
    label: "Cynical",
    description: "Critical and sarcastic",
  },
];

export function CustomInstructionsForm() {
  const user = useQuery(api.users.getCurrentUser);
  const updateCustomInstructions = useMutation(
    api.users.updateCustomInstructions,
  );

  // Existing fields
  const [aboutUser, setAboutUser] = useState("");
  const [responseStyle, setResponseStyle] = useState("");
  const [enabled, setEnabled] = useState(true);

  // New fields
  const [baseStyleAndTone, setBaseStyleAndTone] =
    useState<BaseStyleAndTone>("default");
  const [nickname, setNickname] = useState("");
  const [occupation, setOccupation] = useState("");
  const [moreAboutYou, setMoreAboutYou] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  // Load existing settings
  useEffect(() => {
    if (user?.preferences?.customInstructions) {
      const ci = user.preferences.customInstructions;
      setAboutUser(ci.aboutUser || "");
      setResponseStyle(ci.responseStyle || "");
      setEnabled(ci.enabled ?? true);
      setBaseStyleAndTone(
        (ci.baseStyleAndTone as BaseStyleAndTone) || "default",
      );
      setNickname(ci.nickname || "");
      setOccupation(ci.occupation || "");
      setMoreAboutYou(ci.moreAboutYou || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateCustomInstructions({
        aboutUser,
        responseStyle,
        enabled,
        baseStyleAndTone,
        nickname: nickname || undefined,
        occupation: occupation || undefined,
        moreAboutYou: moreAboutYou || undefined,
      });
      toast.success("Personalization settings saved!");
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
        <CardTitle>Personalization</CardTitle>
        <CardDescription>
          Customize how AI responds to you across all conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Base style and tone */}
        <div className="space-y-2">
          <Label>Base style and tone</Label>
          <p className="text-sm text-muted-foreground">
            Set the style and tone of how the AI responds to you. This doesn't
            impact AI capabilities.
          </p>
          <Select
            value={baseStyleAndTone}
            onValueChange={(value) =>
              setBaseStyleAndTone(value as BaseStyleAndTone)
            }
          >
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              {STYLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Custom instructions */}
        <div className="space-y-2">
          <Label htmlFor="response-style">Custom instructions</Label>
          <Textarea
            id="response-style"
            value={responseStyle}
            onChange={(e) => setResponseStyle(e.target.value)}
            placeholder="e.g., Be concise and direct. Use code examples. Explain trade-offs."
            maxLength={3000}
            rows={4}
            className="resize-none max-h-[150px] min-h-[80px] overflow-y-auto"
          />
          <p className="text-xs text-muted-foreground">
            {responseStyle.length}/3000 characters
          </p>
        </div>

        <Separator />

        {/* About you section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">About you</h3>

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="What should the AI call you?"
              maxLength={100}
            />
          </div>

          {/* Occupation */}
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g., Software Engineer, dad, husband"
              maxLength={200}
            />
          </div>

          {/* More about you */}
          <div className="space-y-2">
            <Label htmlFor="more-about-you">More about you</Label>
            <Textarea
              id="more-about-you"
              value={moreAboutYou}
              onChange={(e) => setMoreAboutYou(e.target.value)}
              placeholder="Share additional context that helps the AI understand you better..."
              maxLength={3000}
              rows={4}
              className="resize-none max-h-[150px] min-h-[80px] overflow-y-auto"
            />
            <p className="text-xs text-muted-foreground">
              {moreAboutYou.length}/3000 characters
            </p>
          </div>

          {/* Legacy about user field (hidden but preserved) */}
          <input type="hidden" value={aboutUser} />
        </div>

        <Separator />

        <div className="flex items-center space-x-2">
          <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="enabled" className="cursor-pointer">
            Enable personalization
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
