"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function MessageLimitSettings() {
  const user = useQuery(api.users.getCurrentUser);
  const updateDailyMessageLimit = useMutation(
    api.users.updateDailyMessageLimit,
  );

  const [dailyLimit, setDailyLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDailyLimit(user.dailyMessageLimit ?? 50);
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateDailyMessageLimit({ dailyMessageLimit: dailyLimit });
      toast.success("Daily message limit updated!");
    } catch (error) {
      toast.error("Failed to update limit");
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

  const currentCount = user.dailyMessageCount ?? 0;
  const currentLimit = user.dailyMessageLimit ?? 50;
  const percentUsed = (currentCount / currentLimit) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Message Limit</CardTitle>
        <CardDescription>
          Control how many messages you can send per day
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="limit">Messages per day</Label>
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

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Today's usage</span>
            <span className="text-sm font-medium">
              {currentCount} / {currentLimit} messages
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Counter resets daily at midnight
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm">
            <strong>Note:</strong> This limit helps manage usage and costs. You
            can adjust it anytime. The counter resets automatically at midnight
            (your local time).
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
