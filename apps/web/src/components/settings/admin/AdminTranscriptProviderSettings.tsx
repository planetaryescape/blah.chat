"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAsyncAction } from "@/hooks/useAsyncAction";

const TRANSCRIPT_PROVIDERS = [
  {
    value: "groq",
    label: "Groq Whisper Turbo",
    defaultCostPerMinute: 0.0067,
    description: "$0.04/hour, fastest processing",
  },
  {
    value: "openai",
    label: "OpenAI Whisper",
    defaultCostPerMinute: 0.006,
    description: "$0.006/min, industry standard",
  },
  {
    value: "deepgram",
    label: "Deepgram Nova-3",
    defaultCostPerMinute: 0.0077,
    description: "$0.0077/min, high accuracy",
  },
  {
    value: "assemblyai",
    label: "AssemblyAI",
    defaultCostPerMinute: 0.0025,
    description: "$0.0025/min, most affordable",
  },
];

function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/settings");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    },
  });
}

function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export function AdminTranscriptProviderSettings() {
  // TODO: Phase G - needs /api/v1/admin/settings REST route
  const { data: settings } = useAdminSettings();

  const updateSettingsMutation = useUpdateAdminSettings();

  const [provider, setProvider] = useState("groq");
  const [costPerMinute, setCostPerMinute] = useState(0.0067);

  // Load settings from query
  useEffect(() => {
    if (settings) {
      setProvider(settings.transcriptProvider ?? "groq");
      setCostPerMinute(settings.transcriptCostPerMinute ?? 0.0067);
    }
  }, [settings]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    // Auto-update cost when provider changes
    const providerInfo = TRANSCRIPT_PROVIDERS.find(
      (p) => p.value === newProvider,
    );
    if (providerInfo) {
      setCostPerMinute(providerInfo.defaultCostPerMinute);
    }
  };

  const { run: handleSave, isPending: saving } = useAsyncAction(
    async () => {
      await updateSettingsMutation.mutateAsync({
        transcriptProvider: provider,
        transcriptCostPerMinute: costPerMinute,
      });
      toast.success(
        `Transcript provider updated to ${TRANSCRIPT_PROVIDERS.find((p) => p.value === provider)?.label}`,
      );
    },
    {
      onError: (error) => {
        // Backend throws environment-aware errors (dev: specific key, prod: generic)
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update transcript provider",
        );
      },
    },
  );

  const hasChanges =
    provider !== settings?.transcriptProvider ||
    costPerMinute !== settings?.transcriptCostPerMinute;

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transcript Provider</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript Provider</CardTitle>
        <CardDescription>
          Configure speech-to-text provider for all voice transcriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSCRIPT_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This provider will be used for all voice input transcriptions
              across the organization
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost-per-minute">Cost per Minute (USD)</Label>
            <Input
              id="cost-per-minute"
              type="number"
              step="0.0001"
              min="0"
              value={costPerMinute}
              onChange={(e) =>
                setCostPerMinute(Number.parseFloat(e.target.value))
              }
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Used for usage tracking and cost reports
            </p>
          </div>

          {hasChanges && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Changing the provider affects all users
            immediately. Ensure the provider API key is configured in
            environment variables.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
