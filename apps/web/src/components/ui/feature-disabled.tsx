"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FeatureDisabledProps {
  feature: string;
  settingKey: string;
  description?: string;
}

export function FeatureDisabled({
  feature,
  settingKey,
  description,
}: FeatureDisabledProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
        <div className="p-4 rounded-full bg-muted/50">
          <Settings className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{feature} is disabled</h2>
          <p className="text-sm text-muted-foreground">
            {description ||
              `This feature has been turned off. You can enable it in your settings.`}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/settings?tab=ui&focus=${settingKey}`}>
            Enable in Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
