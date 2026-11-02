"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
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
import { useUserPreference } from "@/hooks/useUserPreference";

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
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateCustomInstructions = useMutation(
    api.users.updateCustomInstructions,
  );

  // Phase 4: Use new preference hook for source of truth
  const prefCustomInstructions = useUserPreference("customInstructions");

  // Local state for form fields (initialized from hook)
  const [aboutUser, setAboutUser] = useState(
    prefCustomInstructions.aboutUser || "",
  );
  const [responseStyle, setResponseStyle] = useState(
    prefCustomInstructions.responseStyle || "",
  );
  const [enabled, setEnabled] = useState<boolean>(
    prefCustomInstructions.enabled ?? true,
  );
  const [baseStyleAndTone, setBaseStyleAndTone] = useState<BaseStyleAndTone>(
    (prefCustomInstructions.baseStyleAndTone as BaseStyleAndTone) || "default",
  );
  const [nickname, setNickname] = useState(
    prefCustomInstructions.nickname || "",
  );
  const [occupation, setOccupation] = useState(
    prefCustomInstructions.occupation || "",
  );
  const [moreAboutYou, setMoreAboutYou] = useState(
    prefCustomInstructions.moreAboutYou || "",
  );

  const [isLoading, setIsLoading] = useState(false);

  // Sync local state when hook value changes
  useEffect(() => {
    setAboutUser(prefCustomInstructions.aboutUser || "");
    setResponseStyle(prefCustomInstructions.responseStyle || "");
    setEnabled(prefCustomInstructions.enabled ?? true);
    setBaseStyleAndTone(
      (prefCustomInstructions.baseStyleAndTone as BaseStyleAndTone) ||
        "default",
    );
    setNickname(prefCustomInstructions.nickname || "");
    setOccupation(prefCustomInstructions.occupation || "");
    setMoreAboutYou(prefCustomInstructions.moreAboutYou || "");
  }, [prefCustomInstructions]);

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
