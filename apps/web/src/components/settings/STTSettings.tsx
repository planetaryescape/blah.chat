"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TTSSettings } from "@/components/settings/TTSSettings";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserPreference } from "@/hooks/useUserPreference";
import { useApiKeyValidation } from "@/lib/hooks/useApiKeyValidation";

export function STTSettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

  // Phase 4: Use new preference hooks for source of truth
  const prefSttEnabled = useUserPreference("sttEnabled");
  const prefTtsEnabled = useUserPreference("ttsEnabled");
  const prefTtsProvider = useUserPreference("ttsProvider");
  const prefTtsVoice = useUserPreference("ttsVoice");
  const prefTtsSpeed = useUserPreference("ttsSpeed");
  const prefTtsAutoRead = useUserPreference("ttsAutoRead");

  // Local state for optimistic updates (initialized from hooks)
  const [sttEnabled, setSttEnabled] = useState<boolean>(prefSttEnabled);
  const [showKeyMissingModal, setShowKeyMissingModal] = useState(false);

  // API key validation
  const validation = useApiKeyValidation();

  // Sync local state when hook values change
  useEffect(() => {
    setSttEnabled(prefSttEnabled);
  }, [prefSttEnabled]);

  const handleToggleChange = async (checked: boolean) => {
    // Check if trying to enable without API key
    if (checked && !validation.stt.enabled) {
      setShowKeyMissingModal(true);
      return;
    }

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

  if (!user || validation.loading) {
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
            Use voice input to send messages (transcription via{" "}
            {validation.stt.provider || "admin-selected provider"})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning if API key missing */}
          {!validation.stt.enabled && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validation.getSTTErrorMessage()}
              </AlertDescription>
            </Alert>
          )}

          {/* Enable/disable toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="stt-enabled">Enable voice input</Label>
              <p className="text-sm text-muted-foreground">
                Allow microphone access to send voice messages
              </p>
            </div>
            <Switch
              id="stt-enabled"
              checked={sttEnabled}
              onCheckedChange={handleToggleChange}
              disabled={!validation.stt.enabled && !sttEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal for missing API key */}
      <Dialog open={showKeyMissingModal} onOpenChange={setShowKeyMissingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Required</DialogTitle>
            <DialogDescription className="pt-4">
              {validation.getSTTErrorMessage()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowKeyMissingModal(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text-to-Speech Settings */}
      <TTSSettings
        ttsEnabled={prefTtsEnabled}
        ttsProvider={prefTtsProvider}
        ttsVoice={prefTtsVoice}
        ttsSpeed={prefTtsSpeed}
        ttsAutoRead={prefTtsAutoRead}
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
