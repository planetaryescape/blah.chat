"use client";

import { useMutation, useQuery } from "convex/react";
import { Clock, Pin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import {
  getModelConfig,
  getModelsByProvider,
  isValidModel,
} from "@/lib/ai/utils";
import { useUserPreference } from "@/hooks/useUserPreference";

export function DefaultModelSettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePrefs = useMutation(api.users.updatePreferences);
  const hasInitialized = useRef(false);

  // Phase 4: Use new preference hooks for source of truth
  const prefDefaultModel = useUserPreference("defaultModel");
  const prefSelectionMode = useUserPreference("newChatModelSelection");
  const prefRecentModels = useUserPreference("recentModels");

  // Local state for optimistic updates (initialized from hooks)
  const [selectedModel, setSelectedModel] = useState<string>(prefDefaultModel);
  const [selectionMode, setSelectionMode] = useState<"fixed" | "recent">(prefSelectionMode);

  // Sync from hooks OR auto-save default if not set
  useEffect(() => {
    // Check if user has a valid default model (exists in MODEL_CONFIG)
    if (
      prefDefaultModel &&
      prefDefaultModel.length > 0 &&
      isValidModel(prefDefaultModel)
    ) {
      setSelectedModel(prefDefaultModel);
    } else if (!hasInitialized.current) {
      // User has no default model, it's empty, or it's an invalid/deprecated model
      // Auto-save the system default
      hasInitialized.current = true;
      setSelectedModel(DEFAULT_MODEL_ID);
      updatePrefs({ preferences: { defaultModel: DEFAULT_MODEL_ID } });
    }
  }, [prefDefaultModel, updatePrefs]);

  // Sync selection mode when hook value changes
  useEffect(() => {
    setSelectionMode(prefSelectionMode);
  }, [prefSelectionMode]);

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    try {
      await updatePrefs({ preferences: { defaultModel: modelId } });
      toast.success("Default model updated");
    } catch {
      toast.error("Failed to update");
      setSelectedModel(prefDefaultModel);
    }
  };

  const handleModeChange = async (mode: "fixed" | "recent") => {
    setSelectionMode(mode);
    try {
      await updatePrefs({ preferences: { newChatModelSelection: mode } });
      toast.success(
        mode === "fixed"
          ? "New chats will use your default model"
          : "New chats will use your most recent model",
      );
    } catch {
      toast.error("Failed to update");
      setSelectionMode(prefSelectionMode);
    }
  };

  const modelsByProvider = getModelsByProvider();

  // Get the most recent model name for display
  const recentModelId = prefRecentModels[0];
  const recentModelName = recentModelId
    ? getModelConfig(recentModelId)?.name || recentModelId
    : "None yet";

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Chat Model</CardTitle>
        <CardDescription>
          Choose which model to use when starting a new conversation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selection Mode */}
        <RadioGroup
          value={selectionMode}
          onValueChange={(val) => handleModeChange(val as "fixed" | "recent")}
          className="space-y-3"
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
            <div className="space-y-1">
              <Label
                htmlFor="fixed"
                className="flex items-center gap-2 font-medium cursor-pointer"
              >
                <Pin className="h-4 w-4" />
                Fixed Model
              </Label>
              <p className="text-sm text-muted-foreground">
                Always use your selected default model below
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="recent" id="recent" className="mt-1" />
            <div className="space-y-1">
              <Label
                htmlFor="recent"
                className="flex items-center gap-2 font-medium cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                Most Recent Model
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically use the last model you used
                {recentModelId && (
                  <span className="ml-1 text-foreground/80">
                    (currently:{" "}
                    <span className="font-medium">{recentModelName}</span>)
                  </span>
                )}
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Default Model Selector - shown when "fixed" is selected */}
        {selectionMode === "fixed" && (
          <div className="space-y-2 pt-2 border-t">
            <Label>Default Model</Label>
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(modelsByProvider).map(([provider, models]) => (
                  <SelectGroup key={provider}>
                    <SelectLabel>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </SelectLabel>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
