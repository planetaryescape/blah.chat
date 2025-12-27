"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Crown, Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

export function FeaturesSettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const settings = useQuery(api.adminSettings.get);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateSettings = useMutation(api.adminSettings.update);

  const [proModelsEnabled, setProModelsEnabled] = useState(false);
  const [tier1DailyLimit, setTier1DailyLimit] = useState(1);
  const [tier2MonthlyLimit, setTier2MonthlyLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setProModelsEnabled(settings.proModelsEnabled ?? false);
      setTier1DailyLimit(settings.tier1DailyProModelLimit ?? 1);
      setTier2MonthlyLimit(settings.tier2MonthlyProModelLimit ?? 50);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSettings({
        proModelsEnabled,
        tier1DailyProModelLimit: tier1DailyLimit,
        tier2MonthlyProModelLimit: tier2MonthlyLimit,
      });
      toast.success("Pro model settings saved!");
    } catch (_error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Pro Models
          </CardTitle>
          <CardDescription>
            Control access to premium AI models (e.g., Sonar Deep Research)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pro-enabled">Enable pro models</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, pro models are hidden from all non-admin users
              </p>
            </div>
            <Switch
              id="pro-enabled"
              checked={proModelsEnabled}
              onCheckedChange={setProModelsEnabled}
            />
          </div>

          {proModelsEnabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="tier1-limit">Tier 1: Daily limit</Label>
                <Input
                  id="tier1-limit"
                  type="number"
                  value={tier1DailyLimit}
                  onChange={(e) => setTier1DailyLimit(Number(e.target.value))}
                  min={0}
                  max={100}
                />
                <p className="text-sm text-muted-foreground">
                  Pro model messages per day for Tier 1 users (0 = unlimited)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier2-limit">Tier 2: Monthly limit</Label>
                <Input
                  id="tier2-limit"
                  type="number"
                  value={tier2MonthlyLimit}
                  onChange={(e) => setTier2MonthlyLimit(Number(e.target.value))}
                  min={0}
                  max={1000}
                />
                <p className="text-sm text-muted-foreground">
                  Pro model messages per month for Tier 2 users (0 = unlimited)
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">Tier Summary</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                <span className="font-medium">Free:</span> No pro model access
              </li>
              <li>
                <span className="font-medium">Tier 1:</span>{" "}
                {tier1DailyLimit === 0
                  ? "Unlimited"
                  : `${tier1DailyLimit} pro message(s) per day`}
              </li>
              <li>
                <span className="font-medium">Tier 2:</span>{" "}
                {tier2MonthlyLimit === 0
                  ? "Unlimited"
                  : `${tier2MonthlyLimit} pro messages per month`}
              </li>
              <li>
                <span className="font-medium">Admin:</span> Unlimited pro model
                access
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
