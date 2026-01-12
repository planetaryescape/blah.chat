import { Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DisabledFeaturePageProps {
  featureName: "Notes" | "Templates" | "Projects" | "Bookmarks";
  settingKey: "showNotes" | "showTemplates" | "showProjects" | "showBookmarks";
}

/**
 * Displays a helpful message when user accesses a disabled feature via direct URL.
 * Provides clear path to re-enable the feature in settings.
 */
export function DisabledFeaturePage({
  featureName,
  settingKey,
}: DisabledFeaturePageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <span className="text-6xl">😴</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {featureName} Feature is Disabled
          </h1>
          <p className="text-muted-foreground text-lg">
            You've hidden {featureName} from your interface.
          </p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground">
          This feature is currently turned off in your settings. You can
          re-enable it anytime to access {featureName.toLowerCase()}.
        </p>

        {/* Action Button */}
        <div className="pt-4">
          <Button asChild size="lg">
            <Link
              href={`/settings?tab=ui&focus=${settingKey}`}
              className="gap-2"
            >
              <Settings className="h-5 w-5" />
              Enable {featureName} in Settings
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground pt-4">
          Looking for something else?{" "}
          <Link href="/app" className="text-primary hover:underline">
            Go to home
          </Link>
        </p>
      </div>
    </div>
  );
}
