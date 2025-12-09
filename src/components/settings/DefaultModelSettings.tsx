"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { getModelsByProvider } from "@/lib/ai/utils";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function DefaultModelSettings() {
  // @ts-ignore - Convex type instantiation depth issue
  const user = useQuery(api.users.getCurrentUser);
  const updatePrefs = useMutation(api.users.updatePreferences);
  const [selectedModel, setSelectedModel] = useState(
    user?.preferences?.defaultModel || "",
  );

  useEffect(() => {
    if (user?.preferences?.defaultModel) {
      setSelectedModel(user.preferences.defaultModel);
    }
  }, [user?.preferences?.defaultModel]);

  const handleChange = async (modelId: string) => {
    setSelectedModel(modelId);
    try {
      await updatePrefs({ preferences: { defaultModel: modelId } });
      toast.success("Default model updated");
    } catch {
      toast.error("Failed to update");
      setSelectedModel(user?.preferences?.defaultModel || "");
    }
  };

  const modelsByProvider = getModelsByProvider();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Model</CardTitle>
        <CardDescription>Model used for new conversations</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedModel} onValueChange={handleChange}>
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
      </CardContent>
    </Card>
  );
}
