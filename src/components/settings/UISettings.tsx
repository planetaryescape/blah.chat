"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  ComparisonSettingsSection,
  DisplayLayoutSection,
  MessageBehaviorSection,
  ReasoningDisplaySection,
  SidebarFeaturesSection,
  StatisticsSection,
} from "./sections";

// Map setting keys to their accordion section
const SETTING_TO_SECTION: Record<string, string> = {
  // Sidebar features
  showNotes: "sidebar-features",
  showTemplates: "sidebar-features",
  showProjects: "sidebar-features",
  showBookmarks: "sidebar-features",
  showSlides: "sidebar-features",
  // Display
  chatWidth: "display",
  // Stats
  showMessageStats: "stats",
  showComparisonStats: "stats",
  // Messages
  alwaysShowMessageActions: "messages",
  // Reasoning
  showByDefault: "reasoning",
  autoExpand: "reasoning",
  showDuringStreaming: "reasoning",
  // Comparison
  showModelNamesDuringComparison: "comparison",
};

const DEFAULT_EXPANDED = [
  "display",
  "stats",
  "messages",
  "reasoning",
  "comparison",
  "sidebar-features",
];

interface UISettingsProps {
  focusSettingKey?: string | null;
}

export function UISettings({ focusSettingKey }: UISettingsProps) {
  const { state, handlers, isLoading } = useUISettingsState();
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const resetOnboarding = useMutation(api.onboarding.resetOnboarding);

  // Controlled accordion state for deep linking
  const [expandedSections, setExpandedSections] =
    useState<string[]>(DEFAULT_EXPANDED);

  // Handle focus param - expand section and scroll to element
  useEffect(() => {
    if (!focusSettingKey || isLoading) return;

    const section = SETTING_TO_SECTION[focusSettingKey];
    if (section && !expandedSections.includes(section)) {
      setExpandedSections((prev) => [...prev, section]);
    }

    // Scroll after a short delay to allow accordion to expand
    const timer = setTimeout(() => {
      const element = document.getElementById(`setting-${focusSettingKey}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add highlight ring
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
        // Remove highlight after 2 seconds
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 2000);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [focusSettingKey, isLoading]);

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
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-4"
        >
          <DisplayLayoutSection
            chatWidth={state.chatWidth}
            onChatWidthChange={handlers.handleChatWidthChange}
          />

          <StatisticsSection
            showMessageStats={state.showMessageStats}
            showComparisonStats={state.showComparisonStats}
            showSlideStats={state.showSlideStats}
            onMessageStatsChange={handlers.handleMessageStatsChange}
            onComparisonStatsChange={handlers.handleComparisonStatsChange}
            onSlideStatsChange={handlers.handleSlideStatsChange}
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
            showSlides={state.showSlides}
            onShowNotesChange={handlers.handleShowNotesChange}
            onShowTemplatesChange={handlers.handleShowTemplatesChange}
            onShowProjectsChange={handlers.handleShowProjectsChange}
            onShowBookmarksChange={handlers.handleShowBookmarksChange}
            onShowSlidesChange={handlers.handleShowSlidesChange}
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
