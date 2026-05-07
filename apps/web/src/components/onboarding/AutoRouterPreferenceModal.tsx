"use client";

import { getModelsByProvider } from "@blah-chat/ai/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModels } from "@/lib/models/repository";

type SelectionMode = "auto" | "manual" | null;

interface OnboardingState {
  autoRouterPreferenceSet: boolean;
}

async function fetchOnboardingState(): Promise<OnboardingState> {
  const res = await fetch("/api/v1/onboarding");
  if (!res.ok) throw new Error("Failed to fetch onboarding");
  const json = await res.json();
  return json.data as OnboardingState;
}

async function markAutoRouterPreferenceSet() {
  const res = await fetch("/api/v1/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autoRouterPreferenceSet: true }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to record onboarding (${res.status})${text ? `: ${text}` : ""}`,
    );
  }
}

async function updatePreferences(args: {
  preferences: Record<string, unknown>;
}) {
  const res = await fetch("/api/v1/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to save preferences (${res.status})${text ? `: ${text}` : ""}`,
    );
  }
}

export function AutoRouterPreferenceModal() {
  const queryClient = useQueryClient();
  const { data: onboarding } = useQuery({
    queryKey: ["onboarding"],
    queryFn: fetchOnboardingState,
    staleTime: 60_000,
    retry: false,
  });

  const [selection, setSelection] = useState<SelectionMode>(null);
  const [manualModel, setManualModel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const dbModels = useModels();
  const modelsLoaded = Object.keys(dbModels ?? {}).length > 0;
  const modelsByProvider = useMemo(() => {
    const grouped = getModelsByProvider(dbModels);
    const { auto: _auto, ...restGrouped } = grouped;
    for (const [provider, models] of Object.entries(restGrouped)) {
      restGrouped[provider] = models.filter((model) => model.id !== "auto");
    }
    return restGrouped;
  }, [dbModels]);

  const shouldOpen = onboarding ? !onboarding.autoRouterPreferenceSet : false;

  async function commit(mode: "auto" | "manual" | "skip") {
    setError(null);
    setIsSaving(true);
    try {
      if (mode === "skip" || mode === "auto") {
        await updatePreferences({ preferences: { autoRouterEnabled: true } });
      } else {
        if (!manualModel) {
          setError("Pick a default model first");
          setIsSaving(false);
          return;
        }
        await updatePreferences({
          preferences: {
            autoRouterEnabled: false,
            defaultModel: manualModel,
          },
        });
      }
      await markAutoRouterPreferenceSet();
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not save preference";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!selection) {
      setError("Choose an option to continue");
      return;
    }
    await commit(selection);
  }

  async function handleSkip() {
    await commit("skip");
  }

  async function handleRetry() {
    if (!selection) return;
    await commit(selection);
  }

  return (
    <Dialog open={shouldOpen} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Auto Router or Manual?</DialogTitle>
          <DialogDescription>
            Auto Router picks the best model per message. Manual skips the extra
            routing latency. You can change this anytime in Settings → UI → Auto
            Router.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            variant={selection === "auto" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setSelection("auto")}
            disabled={isSaving}
          >
            Use Auto Router
          </Button>
          <Button
            type="button"
            variant={selection === "manual" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setSelection("manual")}
            disabled={isSaving || !modelsLoaded}
          >
            {modelsLoaded ? "Pick my own models" : "Loading models…"}
          </Button>
        </div>

        {selection === "manual" && (
          <div className="space-y-2">
            <Label>Default model</Label>
            <Select
              value={manualModel}
              onValueChange={setManualModel}
              disabled={!modelsLoaded || isSaving}
            >
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

        {error && (
          <div
            role="alert"
            className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100"
          >
            <p className="mb-2 font-medium">{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={isSaving}
            >
              Retry
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isSaving}
          >
            Skip for now
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
