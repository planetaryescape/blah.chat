"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Loader2, MessageCircle, Plug } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAsyncAction } from "@/hooks/useAsyncAction";

export function AdminLimitsSettings() {
  // TODO: Phase G - needs /api/v1/admin/settings REST route
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/settings");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    },
  });

  const updateSettingsMut = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  const [monthlyBudget, setMonthlyBudget] = useState(10);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [hardLimitEnabled, setHardLimitEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [maxIntegrations, setMaxIntegrations] = useState(5);

  // Load settings from query
  useEffect(() => {
    if (settings) {
      setMonthlyBudget(settings.defaultMonthlyBudget ?? 10);
      setAlertThreshold((settings.defaultBudgetAlertThreshold ?? 0.8) * 100);
      setHardLimitEnabled(settings.budgetHardLimitEnabled ?? true);
      setDailyLimit(settings.defaultDailyMessageLimit ?? 50);
      setMaxIntegrations(settings.maxActiveIntegrations ?? 5);
    }
  }, [settings]);

  const { run: handleSave, isPending: isLoading } = useAsyncAction(
    async () => {
      await updateSettingsMut.mutateAsync({
        defaultMonthlyBudget: monthlyBudget,
        defaultBudgetAlertThreshold: alertThreshold / 100,
        budgetHardLimitEnabled: hardLimitEnabled,
        defaultDailyMessageLimit: dailyLimit,
        maxActiveIntegrations: maxIntegrations,
      });
      toast.success("Limits and budget settings saved!");
    },
    { onError: () => toast.error("Failed to save settings") },
  );

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Limits & Budget</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Settings</CardTitle>
          <CardDescription>
            Global monthly spending limits for all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="budget">
              Default monthly budget per user (USD)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="budget"
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                min={0}
                step={1}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Set to 0 to disable budget tracking
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alert threshold</Label>
              <p className="text-sm text-muted-foreground">
                Show warning at {alertThreshold}% of budget
              </p>
            </div>
            <Slider
              value={[alertThreshold]}
              onValueChange={(value) => setAlertThreshold(value[0])}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hard-limit">Hard limit enforcement</Label>
              <p className="text-sm text-muted-foreground">
                Block sending messages when budget is exceeded
              </p>
            </div>
            <Switch
              id="hard-limit"
              checked={hardLimitEnabled}
              onCheckedChange={setHardLimitEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Message Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Message Limits</CardTitle>
          <CardDescription>Daily message limits for all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="limit">Default messages per day per user</Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="limit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={1}
                max={1000}
                step={1}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Range: 1-1000 messages
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <strong>Note:</strong> Counters reset daily at midnight (user's
              local time).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Limits</CardTitle>
          <CardDescription>
            Limit how many external service integrations (Composio) each user
            can connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="integrations">
              Max active integrations per user
            </Label>
            <div className="relative">
              <Plug className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="integrations"
                type="number"
                value={maxIntegrations}
                onChange={(e) => setMaxIntegrations(Number(e.target.value))}
                min={1}
                max={20}
                step={1}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Range: 1-20. Each integration adds 10-20 tools to the AI context.
              Higher limits may reduce model accuracy.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> These settings apply globally to all users.
          Budget tracking uses per-message cost from token usage. Costs may vary
          slightly from provider billing due to rounding.
        </p>
      </div>

      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
