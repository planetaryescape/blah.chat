"use client";

import { TTSSettings } from "@/components/settings/TTSSettings";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function STTSettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [sttEnabled, setSttEnabled] = useState(true);
  const [sttProvider, setSttProvider] = useState<
    "openai" | "deepgram" | "assemblyai" | "groq"
  >("openai");

  useEffect(() => {
    if (user?.preferences) {
      setSttEnabled(user.preferences.sttEnabled ?? true);
      setSttProvider(user.preferences.sttProvider ?? "openai");
    }
  }, [user]);

  const handleToggleChange = async (checked: boolean) => {
    setSttEnabled(checked);
    try {
      await updatePreferences({
        preferences: {
          sttEnabled: checked,
        },
      });
      toast.success(`Voice input ${checked ? "enabled" : "disabled"}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setSttEnabled(!checked);
    }
  };

  const handleProviderChange = async (
    value: "openai" | "deepgram" | "assemblyai" | "groq",
  ) => {
    setSttProvider(value);
    try {
      await updatePreferences({
        preferences: {
          sttProvider: value,
        },
      });
      toast.success(`Provider changed to ${value}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setSttProvider(sttProvider);
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
    <div className="space-y-6">
      {/* Speech-to-Text Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Speech-to-Text (Input)</CardTitle>
          <CardDescription>
            Choose your voice transcription provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/disable toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="stt-enabled">Enable voice input</Label>
              <p className="text-sm text-muted-foreground">
                Allow voice-to-text transcription in chat
              </p>
            </div>
            <Switch
              id="stt-enabled"
              checked={sttEnabled}
              onCheckedChange={handleToggleChange}
            />
          </div>

          {/* Provider selection */}
          <div className="space-y-2">
            <Label htmlFor="stt-provider">Transcription Provider</Label>
            <Select
              value={sttProvider}
              onValueChange={handleProviderChange}
              disabled={!sttEnabled}
            >
              <SelectTrigger id="stt-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">
                  OpenAI Whisper ($0.006/min) - Simplest
                </SelectItem>
                <SelectItem value="deepgram">
                  Deepgram Nova-3 ($0.0077/min) - Fastest
                </SelectItem>
                <SelectItem value="assemblyai">
                  AssemblyAI ($0.0025/min) - Most Accurate
                </SelectItem>
                <SelectItem value="groq">
                  Groq Whisper Turbo ($0.04/hour) - Fast & Affordable
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All providers require server-side processing. Works on any
              network.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Text-to-Speech Settings */}
      <TTSSettings
        ttsEnabled={user.preferences?.ttsEnabled ?? false}
        ttsProvider={user.preferences?.ttsProvider ?? "deepgram"}
        ttsVoice={user.preferences?.ttsVoice ?? "aura-asteria-en"}
        ttsSpeed={user.preferences?.ttsSpeed ?? 1.0}
        ttsAutoRead={user.preferences?.ttsAutoRead ?? false}
        onSettingsChange={async (settings: any) => {
          try {
            await updatePreferences({ preferences: settings });
            toast.success("TTS settings updated!");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Failed to save",
            );
          }
        }}
      />
    </div>
  );
}
