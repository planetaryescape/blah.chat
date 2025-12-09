"use client";

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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";

interface TTSSettingsProps {
  ttsEnabled: boolean;
  ttsProvider: string;
  ttsVoice: string;
  ttsSpeed: number;
  ttsAutoRead: boolean;
  onSettingsChange: (settings: {
    ttsEnabled?: boolean;
    ttsProvider?: string;
    ttsVoice?: string;
    ttsSpeed?: number;
    ttsAutoRead?: boolean;
  }) => void;
}

/**
 * TTS settings panel
 *
 * Provider: Deepgram Aura (pay-as-you-go, $200 free credits)
 */
export function TTSSettings({
  ttsEnabled,
  ttsProvider,
  ttsVoice,
  ttsSpeed,
  ttsAutoRead,
  onSettingsChange,
}: TTSSettingsProps) {
  const [localSpeed, setLocalSpeed] = useState(ttsSpeed);

  // Voice options per provider
  const voiceOptions = {
    deepgram: [
      // English Voices - Female
      { value: "aura-asteria-en", label: "Asteria (Female, warm)" },
      { value: "aura-luna-en", label: "Luna (Female, expressive)" },
      { value: "aura-stella-en", label: "Stella (Female, professional)" },
      { value: "aura-athena-en", label: "Athena (Female, authoritative)" },
      { value: "aura-hera-en", label: "Hera (Female, friendly)" },
      { value: "aura-amalthea-en", label: "Amalthea (Female, gentle)" },
      { value: "aura-andromeda-en", label: "Andromeda (Female, clear)" },
      { value: "aura-aurora-en", label: "Aurora (Female, soft)" },
      { value: "aura-callista-en", label: "Callista (Female, powerful)" },
      { value: "aura-cora-en", label: "Cora (Female, balanced)" },
      { value: "aura-cordelia-en", label: "Cordelia (Female, sweet)" },
      { value: "aura-delia-en", label: "Delia (Female, calm)" },
      { value: "aura-electra-en", label: "Electra (Female, edgy)" },
      { value: "aura-harmonia-en", label: "Harmonia (Female, musical)" },
      { value: "aura-helena-en", label: "Helena (Female, classic)" },
      { value: "aura-iris-en", label: "Iris (Female, bright)" },
      { value: "aura-juno-en", label: "Juno (Female, mature)" },
      { value: "aura-minerva-en", label: "Minerva (Female, wise)" },
      { value: "aura-ophelia-en", label: "Ophelia (Female, dreamy)" },
      { value: "aura-pandora-en", label: "Pandora (Female, mysterious)" },
      { value: "aura-phoebe-en", label: "Phoebe (Female, energetic)" },
      { value: "aura-selene-en", label: "Selene (Female, mysterious)" },
      { value: "aura-thalia-en", label: "Thalia (Female, cheerful)" },
      { value: "aura-theia-en", label: "Theia (Female, motherly)" },
      { value: "aura-vesta-en", label: "Vesta (Female, homey)" },

      // English Voices - Male
      { value: "aura-orion-en", label: "Orion (Male, confident)" },
      { value: "aura-arcas-en", label: "Arcas (Male, calm)" },
      { value: "aura-perseus-en", label: "Perseus (Male, energetic)" },
      { value: "aura-angus-en", label: "Angus (Male, Irish accent)" },
      { value: "aura-orpheus-en", label: "Orpheus (Male, storytelling)" },
      { value: "aura-helios-en", label: "Helios (Male, warm)" },
      { value: "aura-zeus-en", label: "Zeus (Male, authoritative)" },
      { value: "aura-apollo-en", label: "Apollo (Male, bold)" },
      { value: "aura-aries-en", label: "Aries (Male, aggressive)" },
      { value: "aura-atlas-en", label: "Atlas (Male, strong)" },
      { value: "aura-draco-en", label: "Draco (Male, deep)" },
      { value: "aura-hermes-en", label: "Hermes (Male, quick)" },
      { value: "aura-hyperion-en", label: "Hyperion (Male, commanding)" },
      { value: "aura-janus-en", label: "Janus (Male, dual)" },
      { value: "aura-jupiter-en", label: "Jupiter (Male, kingly)" },
      { value: "aura-mars-en", label: "Mars (Male, battle-ready)" },
      { value: "aura-neptune-en", label: "Neptune (Male, vast)" },
      { value: "aura-odysseus-en", label: "Odysseus (Male, clever)" },
      { value: "aura-pluto-en", label: "Pluto (Male, dark)" },
      { value: "aura-saturn-en", label: "Saturn (Male, old)" },
    ],
  };

  const currentVoices = voiceOptions.deepgram;

  // Force provider to Deepgram now that other providers are removed
  useEffect(() => {
    if (ttsProvider !== "deepgram") {
      onSettingsChange({ ttsProvider: "deepgram" });
    }
  }, [ttsProvider, onSettingsChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text-to-Speech (TTS)</CardTitle>
        <CardDescription>
          Listen to AI responses with natural voices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tts-enabled">Enable Text-to-Speech</Label>
            <p className="text-sm text-muted-foreground">
              Add play buttons to assistant messages
            </p>
          </div>
          <Switch
            id="tts-enabled"
            checked={ttsEnabled}
            onCheckedChange={(checked) =>
              onSettingsChange({ ttsEnabled: checked })
            }
          />
        </div>

        {ttsEnabled && (
          <>
            {/* Provider Info */}
            <div className="space-y-1">
              <Label>Provider</Label>
              <p className="text-sm text-muted-foreground">
                Deepgram Aura (pay-as-you-go, $200 free credits). Other TTS
                providers have been removed.
              </p>
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
              <Label htmlFor="tts-voice">Voice</Label>
              <Select
                value={ttsVoice}
                onValueChange={(value) => onSettingsChange({ ttsVoice: value })}
              >
                <SelectTrigger id="tts-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentVoices.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tts-speed">Speed</Label>
                <span className="text-sm text-muted-foreground">
                  {localSpeed.toFixed(1)}x
                </span>
              </div>
              <Slider
                id="tts-speed"
                value={[localSpeed]}
                onValueChange={([value]) => setLocalSpeed(value)}
                onValueCommit={([value]) =>
                  onSettingsChange({ ttsSpeed: value })
                }
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust playback speed (0.5x - 2x)
              </p>
            </div>

            {/* Auto-read */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tts-auto-read">Auto-read responses</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically play audio for new messages
                </p>
              </div>
              <Switch
                id="tts-auto-read"
                checked={ttsAutoRead}
                onCheckedChange={(checked) =>
                  onSettingsChange({ ttsAutoRead: checked })
                }
              />
            </div>

            {/* Info */}
            <div className="flex gap-2 rounded-lg bg-muted p-3">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Cost is tracked per character. Deepgram offers $200 free
                  credits and pay-as-you-go billing.
                </p>
                <p className="mt-1">
                  <strong>Deepgram:</strong> Best value, natural quality.
                  Other TTS providers were removed to keep costs predictable.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
