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
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Info, Star } from "lucide-react";
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

// Deepgram Aura-2 voices - organized by language and gender
const DEEPGRAM_VOICES = {
  // Featured Aura-2 English voices (recommended)
  featuredEnglish: [
    { value: "aura-2-thalia-en", label: "Thalia", gender: "Female", style: "Versatile" },
    { value: "aura-2-andromeda-en", label: "Andromeda", gender: "Female", style: "Expressive" },
    { value: "aura-2-helena-en", label: "Helena", gender: "Female", style: "Warm" },
    { value: "aura-2-apollo-en", label: "Apollo", gender: "Male", style: "Professional" },
    { value: "aura-2-arcas-en", label: "Arcas", gender: "Male", style: "Calm" },
    { value: "aura-2-aries-en", label: "Aries", gender: "Male", style: "Confident" },
  ],
  // All Aura-2 English voices
  english: [
    { value: "aura-2-amalthea-en", label: "Amalthea", gender: "Female", style: "Gentle" },
    { value: "aura-2-asteria-en", label: "Asteria", gender: "Female", style: "Warm" },
    { value: "aura-2-athena-en", label: "Athena", gender: "Female", style: "Authoritative" },
    { value: "aura-2-atlas-en", label: "Atlas", gender: "Male", style: "Strong" },
    { value: "aura-2-aurora-en", label: "Aurora", gender: "Female", style: "Bright" },
    { value: "aura-2-callista-en", label: "Callista", gender: "Female", style: "Elegant" },
    { value: "aura-2-cora-en", label: "Cora", gender: "Female", style: "Friendly" },
    { value: "aura-2-cordelia-en", label: "Cordelia", gender: "Female", style: "Refined" },
    { value: "aura-2-delia-en", label: "Delia", gender: "Female", style: "Sweet" },
    { value: "aura-2-draco-en", label: "Draco", gender: "Male", style: "Deep" },
    { value: "aura-2-electra-en", label: "Electra", gender: "Female", style: "Energetic" },
    { value: "aura-2-harmonia-en", label: "Harmonia", gender: "Female", style: "Balanced" },
    { value: "aura-2-hera-en", label: "Hera", gender: "Female", style: "Regal" },
    { value: "aura-2-hermes-en", label: "Hermes", gender: "Male", style: "Quick" },
    { value: "aura-2-hyperion-en", label: "Hyperion", gender: "Male", style: "Powerful" },
    { value: "aura-2-iris-en", label: "Iris", gender: "Female", style: "Colorful" },
    { value: "aura-2-janus-en", label: "Janus", gender: "Male", style: "Thoughtful" },
    { value: "aura-2-juno-en", label: "Juno", gender: "Female", style: "Majestic" },
    { value: "aura-2-jupiter-en", label: "Jupiter", gender: "Male", style: "Commanding" },
    { value: "aura-2-luna-en", label: "Luna", gender: "Female", style: "Dreamy" },
    { value: "aura-2-mars-en", label: "Mars", gender: "Male", style: "Bold" },
    { value: "aura-2-minerva-en", label: "Minerva", gender: "Female", style: "Wise" },
    { value: "aura-2-neptune-en", label: "Neptune", gender: "Male", style: "Flowing" },
    { value: "aura-2-odysseus-en", label: "Odysseus", gender: "Male", style: "Storytelling" },
    { value: "aura-2-ophelia-en", label: "Ophelia", gender: "Female", style: "Poetic" },
    { value: "aura-2-orion-en", label: "Orion", gender: "Male", style: "Strong" },
    { value: "aura-2-orpheus-en", label: "Orpheus", gender: "Male", style: "Musical" },
    { value: "aura-2-pandora-en", label: "Pandora", gender: "Female", style: "Mysterious" },
    { value: "aura-2-phoebe-en", label: "Phoebe", gender: "Female", style: "Bright" },
    { value: "aura-2-pluto-en", label: "Pluto", gender: "Male", style: "Deep" },
    { value: "aura-2-saturn-en", label: "Saturn", gender: "Male", style: "Steady" },
    { value: "aura-2-selene-en", label: "Selene", gender: "Female", style: "Serene" },
    { value: "aura-2-theia-en", label: "Theia", gender: "Female", style: "Radiant" },
    { value: "aura-2-vesta-en", label: "Vesta", gender: "Female", style: "Warm" },
    { value: "aura-2-zeus-en", label: "Zeus", gender: "Male", style: "Authoritative" },
  ],
  // Featured Aura-2 Spanish voices
  featuredSpanish: [
    { value: "aura-2-celeste-es", label: "Celeste", gender: "Female", style: "Clear" },
    { value: "aura-2-estrella-es", label: "Estrella", gender: "Female", style: "Bright" },
    { value: "aura-2-nestor-es", label: "Nestor", gender: "Male", style: "Warm" },
  ],
  // All Aura-2 Spanish voices
  spanish: [
    { value: "aura-2-sirio-es", label: "Sirio", gender: "Male", style: "Strong" },
    { value: "aura-2-carina-es", label: "Carina", gender: "Female", style: "Friendly" },
    { value: "aura-2-alvaro-es", label: "Alvaro", gender: "Male", style: "Professional" },
    { value: "aura-2-diana-es", label: "Diana", gender: "Female", style: "Elegant", bilingual: true },
    { value: "aura-2-aquila-es", label: "Aquila", gender: "Female", style: "Swift", bilingual: true },
    { value: "aura-2-selena-es", label: "Selena", gender: "Female", style: "Melodic", bilingual: true },
    { value: "aura-2-javier-es", label: "Javier", gender: "Male", style: "Natural", bilingual: true },
  ],
  // Legacy Aura-1 English voices (still available)
  legacy: [
    { value: "aura-asteria-en", label: "Asteria (v1)", gender: "Female", style: "Warm" },
    { value: "aura-luna-en", label: "Luna (v1)", gender: "Female", style: "Expressive" },
    { value: "aura-stella-en", label: "Stella (v1)", gender: "Female", style: "Professional" },
    { value: "aura-athena-en", label: "Athena (v1)", gender: "Female", style: "Authoritative" },
    { value: "aura-hera-en", label: "Hera (v1)", gender: "Female", style: "Friendly" },
    { value: "aura-orion-en", label: "Orion (v1)", gender: "Male", style: "Confident" },
    { value: "aura-arcas-en", label: "Arcas (v1)", gender: "Male", style: "Calm" },
    { value: "aura-perseus-en", label: "Perseus (v1)", gender: "Male", style: "Energetic" },
    { value: "aura-angus-en", label: "Angus (v1)", gender: "Male", style: "Irish accent" },
    { value: "aura-orpheus-en", label: "Orpheus (v1)", gender: "Male", style: "Storytelling" },
    { value: "aura-helios-en", label: "Helios (v1)", gender: "Male", style: "Warm" },
    { value: "aura-zeus-en", label: "Zeus (v1)", gender: "Male", style: "Authoritative" },
  ],
};

/**
 * TTS settings panel
 *
 * Provider: Deepgram Aura (pay-as-you-go, $200 free credits)
 * Now includes all 40+ Aura-2 voices across English and Spanish
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

  // Force provider to Deepgram now that other providers are removed
  useEffect(() => {
    if (ttsProvider !== "deepgram") {
      onSettingsChange({ ttsProvider: "deepgram" });
    }
  }, [ttsProvider, onSettingsChange]);

  const formatVoiceLabel = (voice: { label: string; gender: string; style: string; bilingual?: boolean }) => {
    const bilingual = voice.bilingual ? " 🌐" : "";
    return `${voice.label} (${voice.gender}, ${voice.style})${bilingual}`;
  };

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
                Deepgram Aura-2 (40+ voices, pay-as-you-go with $200 free credits)
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
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {/* Featured English */}
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-yellow-500" />
                      Featured English
                    </SelectLabel>
                    {DEEPGRAM_VOICES.featuredEnglish.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {formatVoiceLabel(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* All English Voices */}
                  <SelectGroup>
                    <SelectLabel>All English Voices</SelectLabel>
                    {DEEPGRAM_VOICES.english.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {formatVoiceLabel(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Featured Spanish */}
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-yellow-500" />
                      Featured Spanish
                    </SelectLabel>
                    {DEEPGRAM_VOICES.featuredSpanish.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {formatVoiceLabel(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* All Spanish Voices */}
                  <SelectGroup>
                    <SelectLabel>All Spanish Voices (🌐 = bilingual)</SelectLabel>
                    {DEEPGRAM_VOICES.spanish.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {formatVoiceLabel(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>

                  {/* Legacy Aura-1 */}
                  <SelectGroup>
                    <SelectLabel>Legacy (Aura v1)</SelectLabel>
                    {DEEPGRAM_VOICES.legacy.map((voice) => (
                      <SelectItem key={voice.value} value={voice.value}>
                        {formatVoiceLabel(voice)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose from 50+ natural voices across English and Spanish
              </p>
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
                  <strong>Aura-2 voices</strong> offer improved quality and natural speech.
                  Spanish voices marked with 🌐 can seamlessly switch between English and Spanish.
                </p>
                <p>
                  Cost is ~$0.003 per 1000 characters. Deepgram offers $200 free credits.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
