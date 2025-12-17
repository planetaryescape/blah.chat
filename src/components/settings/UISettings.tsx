"use client";

import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useUISettingsState } from "@/hooks/useUISettingsState";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  ComparisonSettingsSection,
  DisplayLayoutSection,
  MessageBehaviorSection,
  ReasoningDisplaySection,
  SidebarFeaturesSection,
  StatisticsSection,
} from "./sections";

export function UISettings() {
  const { state, handlers, isLoading } = useUISettingsState();
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const resetOnboarding = useMutation(api.onboarding.resetOnboarding);

  if (isLoading) {
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
        <CardTitle>UI Settings</CardTitle>
        <CardDescription>
          Customize the appearance and behavior of the interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion
          type="multiple"
          defaultValue={[
            "display",
            "stats",
            "messages",
            "reasoning",
            "comparison",
            "sidebar-features",
          ]}
          className="space-y-4"
        >
          <DisplayLayoutSection
            chatWidth={state.chatWidth}
            onChatWidthChange={handlers.handleChatWidthChange}
          />

          <StatisticsSection
            showMessageStats={state.showMessageStats}
            showComparisonStats={state.showComparisonStats}
            onMessageStatsChange={handlers.handleMessageStatsChange}
            onComparisonStatsChange={handlers.handleComparisonStatsChange}
          />

          <MessageBehaviorSection
            alwaysShowMessageActions={state.alwaysShowMessageActions}
            onAlwaysShowActionsChange={handlers.handleAlwaysShowActionsChange}
          />

          <ReasoningDisplaySection
            showByDefault={state.showByDefault}
            autoExpand={state.autoExpand}
            showDuringStreaming={state.showDuringStreaming}
            onShowByDefaultChange={handlers.handleShowByDefaultChange}
            onAutoExpandChange={handlers.handleAutoExpandChange}
            onShowDuringStreamingChange={
              handlers.handleShowDuringStreamingChange
            }
          />

          <ComparisonSettingsSection
            showModelNamesDuringComparison={
              state.showModelNamesDuringComparison
            }
            onShowModelNamesChange={handlers.handleShowModelNamesChange}
          />

          <SidebarFeaturesSection
            showNotes={state.showNotes}
            showTemplates={state.showTemplates}
            showProjects={state.showProjects}
            showBookmarks={state.showBookmarks}
            onShowNotesChange={handlers.handleShowNotesChange}
            onShowTemplatesChange={handlers.handleShowTemplatesChange}
            onShowProjectsChange={handlers.handleShowProjectsChange}
            onShowBookmarksChange={handlers.handleShowBookmarksChange}
          />
        </Accordion>

        {/* Onboarding Tour */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label>Onboarding Tour</Label>
            <p className="text-sm text-muted-foreground">
              Restart the first-time user walkthrough
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await resetOnboarding();
                toast.success("Tour reset! Reload to see it again.");
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              } catch (_error) {
                toast.error("Failed to reset tour");
              }
            }}
          >
            Restart Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
