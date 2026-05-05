"use client";

import { getModelsByProvider } from "@blah-chat/ai/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { useAsyncAction } from "@/hooks/useAsyncAction";
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
  await fetch("/api/v1/onboarding", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ autoRouterPreferenceSet: true }),
  });
}

async function updatePreferences(args: {
  preferences: Record<string, unknown>;
}) {
  await fetch("/api/v1/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
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

  const dbModels = useModels();
  const modelsByProvider = useMemo(() => {
    const grouped = getModelsByProvider(dbModels);
    const { auto: _auto, ...restGrouped } = grouped;
    for (const [provider, models] of Object.entries(restGrouped)) {
      restGrouped[provider] = models.filter((model) => model.id !== "auto");
    }
    return restGrouped;
  }, [dbModels]);

  const shouldOpen = onboarding ? !onboarding.autoRouterPreferenceSet : false;

  const { run: handleSave, isPending: isSaving } = useAsyncAction(
    async () => {
      if (!selection) {
        toast.error("Choose an option to continue");
        return;
      }
      if (selection === "manual" && !manualModel) {
        toast.error("Select a default model");
        return;
      }

      if (selection === "auto") {
        await updatePreferences({
          preferences: { autoRouterEnabled: true },
        });
      } else {
        await updatePreferences({
          preferences: {
            autoRouterEnabled: false,
            defaultModel: manualModel,
          },
        });
      }

      await markAutoRouterPreferenceSet();
      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
    },
    {
      onError: (error) => {
        console.error("[AutoRouterPreferenceModal] Failed to save:", error);
        toast.error("Failed to save preference");
      },
    },
  );

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
          >
            Use Auto Router
          </Button>
          <Button
            type="button"
            variant={selection === "manual" ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setSelection("manual")}
          >
            Pick my own models
          </Button>
        </div>

        {selection === "manual" && (
          <div className="space-y-2">
            <Label>Default model</Label>
            <Select value={manualModel} onValueChange={setManualModel}>
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

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
