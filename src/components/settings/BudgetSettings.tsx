"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export function BudgetSettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updateBudgetSettings = useMutation(api.users.updateBudgetSettings);

  const [monthlyBudget, setMonthlyBudget] = useState(10);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [hardLimitEnabled, setHardLimitEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setMonthlyBudget(user.monthlyBudget ?? 10);
      setAlertThreshold((user.budgetAlertThreshold ?? 0.8) * 100);
      setHardLimitEnabled(user.preferences?.budgetHardLimitEnabled ?? true);
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateBudgetSettings({
        monthlyBudget,
        budgetAlertThreshold: alertThreshold / 100,
        budgetHardLimitEnabled: hardLimitEnabled,
      });
      toast.success("Budget settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
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
    <Card>
      <CardHeader>
        <CardTitle>Budget Settings</CardTitle>
        <CardDescription>
          Control monthly spending on AI model usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="budget">Monthly budget (USD)</Label>
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

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm">
            <strong>Note:</strong> Budget tracking uses the per-message cost calculated from
            token usage. Costs may vary slightly from provider billing due to rounding.
          </p>
        </div>

        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
