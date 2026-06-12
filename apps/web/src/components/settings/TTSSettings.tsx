"use client";

import { TTS_VOICE_OPTIONS } from "@blah-chat/shared/tts";
import { AlertCircle, Check, ChevronsUpDown, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useApiKeyValidation } from "@/lib/hooks/useApiKeyValidation";
import { cn } from "@/lib/utils";

interface TTSSettingsProps {
  ttsEnabled: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  ttsAutoRead: boolean;
  onSettingsChange: (settings: {
    ttsEnabled?: boolean;
    ttsVoice?: string;
    ttsSpeed?: number;
    ttsAutoRead?: boolean;
  }) => void;
}

const VOICE_OPTIONS = TTS_VOICE_OPTIONS;

/**
 * TTS settings panel
 *
 * Provider: Deepgram Aura (pay-as-you-go, $200 free credits)
 */
export function TTSSettings({
  ttsEnabled,
  ttsVoice,
  ttsSpeed,
  ttsAutoRead,
  onSettingsChange,
}: TTSSettingsProps) {
  const [localSpeed, setLocalSpeed] = useState(ttsSpeed);
  const [showKeyMissingModal, setShowKeyMissingModal] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  // API key validation
  const validation = useApiKeyValidation();

  const handleToggle = (checked: boolean) => {
    // Check if trying to enable without API key
    if (checked && !validation.tts.enabled) {
      setShowKeyMissingModal(true);
      return;
    }

    onSettingsChange({ ttsEnabled: checked });
  };

  const selectedVoice = useMemo(
    () => VOICE_OPTIONS.find((v) => v.value === ttsVoice),
    [ttsVoice],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text-to-Speech (TTS)</CardTitle>
        <CardDescription>
          Listen to AI responses with natural voices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning if API key missing */}
        {!validation.tts.enabled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.getTTSErrorMessage()}
            </AlertDescription>
          </Alert>
        )}

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
            onCheckedChange={handleToggle}
            disabled={!validation.tts.enabled && !ttsEnabled}
          />
        </div>

        {ttsEnabled && (
          <>
            {/* Voice Selection - Searchable Combobox */}
            <div className="space-y-2">
              <Label>Voice</Label>
              <Popover open={voiceOpen} onOpenChange={setVoiceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={voiceOpen}
                    aria-controls="tts-voice-listbox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedVoice?.label ?? "Select voice..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  id="tts-voice-listbox"
                  className="w-[--radix-popover-trigger-width] p-0"
                >
                  <Command>
                    <CommandInput placeholder="Search voices..." />
                    <CommandList>
                      <CommandEmpty>No voice found.</CommandEmpty>
                      <CommandGroup>
                        {VOICE_OPTIONS.map((voice) => (
                          <CommandItem
                            key={voice.value}
                            value={voice.label}
                            onSelect={() => {
                              onSettingsChange({ ttsVoice: voice.value });
                              setVoiceOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                ttsVoice === voice.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {voice.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Modal for missing API key */}
      <Dialog open={showKeyMissingModal} onOpenChange={setShowKeyMissingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Required</DialogTitle>
            <DialogDescription className="pt-4">
              {validation.getTTSErrorMessage()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowKeyMissingModal(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
