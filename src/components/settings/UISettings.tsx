"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";

export function UISettings() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const resetOnboarding = useMutation(api.onboarding.resetOnboarding);

  const [alwaysShowMessageActions, setAlwaysShowMessageActions] =
    useState(false);
  const [showModelNamesDuringComparison, setShowModelNamesDuringComparison] =
    useState(false);

  // Statistics display settings
  const [showMessageStats, setShowMessageStats] = useState(true);
  const [showComparisonStats, setShowComparisonStats] = useState(true);

  // Reasoning display settings
  const [showByDefault, setShowByDefault] = useState(true);
  const [autoExpand, setAutoExpand] = useState(false);
  const [showDuringStreaming, setShowDuringStreaming] = useState(true);

  // Chat width setting
  const [chatWidth, setChatWidth] = useState<ChatWidth>("standard");

  // Feature visibility toggles
  const [showNotes, setShowNotes] = useState(true);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showBookmarks, setShowBookmarks] = useState(true);

  useEffect(() => {
    if (user?.preferences) {
      setAlwaysShowMessageActions(
        user.preferences.alwaysShowMessageActions ?? false,
      );
      setShowModelNamesDuringComparison(
        user.preferences.showModelNamesDuringComparison ?? false,
      );

      // Initialize statistics settings
      setShowMessageStats(user.preferences.showMessageStatistics ?? true);
      setShowComparisonStats(user.preferences.showComparisonStatistics ?? true);

      // Initialize reasoning settings
      if (user.preferences.reasoning) {
        setShowByDefault(user.preferences.reasoning.showByDefault ?? true);
        setAutoExpand(user.preferences.reasoning.autoExpand ?? false);
        setShowDuringStreaming(
          user.preferences.reasoning.showDuringStreaming ?? true,
        );
      }

      // Initialize chat width setting
      if (user.preferences.chatWidth) {
        setChatWidth(user.preferences.chatWidth as ChatWidth);
      }

      // Initialize feature visibility toggles
      setShowNotes(user.preferences.showNotes ?? true);
      setShowTemplates(user.preferences.showTemplates ?? true);
      setShowProjects(user.preferences.showProjects ?? true);
      setShowBookmarks(user.preferences.showBookmarks ?? true);
    }
  }, [user]);

  const handleAlwaysShowActionsChange = async (checked: boolean) => {
    setAlwaysShowMessageActions(checked);
    try {
      await updatePreferences({
        preferences: {
          alwaysShowMessageActions: checked,
        },
      });
      toast.success("UI settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "always_show_message_actions",
        value: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setAlwaysShowMessageActions(!checked);
    }
  };

  const handleShowModelNamesChange = async (checked: boolean) => {
    setShowModelNamesDuringComparison(checked);
    try {
      await updatePreferences({
        preferences: {
          showModelNamesDuringComparison: checked,
        } as any,
      });
      toast.success("UI settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_model_names_during_comparison",
        value: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowModelNamesDuringComparison(!checked);
    }
  };

  const handleShowByDefaultChange = async (checked: boolean) => {
    setShowByDefault(checked);
    try {
      await updatePreferences({
        preferences: {
          reasoning: {
            showByDefault: checked,
            autoExpand,
            showDuringStreaming,
          },
        } as any,
      });
      toast.success("Reasoning settings saved!");

      analytics.track("reasoning_display_changed", {
        setting: "show_by_default",
        value: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowByDefault(!checked);
    }
  };

  const handleAutoExpandChange = async (checked: boolean) => {
    setAutoExpand(checked);
    try {
      await updatePreferences({
        preferences: {
          reasoning: {
            showByDefault,
            autoExpand: checked,
            showDuringStreaming,
          },
        } as any,
      });
      toast.success("Reasoning settings saved!");

      analytics.track("reasoning_display_changed", {
        setting: "auto_expand",
        value: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setAutoExpand(!checked);
    }
  };

  const handleShowDuringStreamingChange = async (checked: boolean) => {
    setShowDuringStreaming(checked);
    try {
      await updatePreferences({
        preferences: {
          reasoning: {
            showByDefault,
            autoExpand,
            showDuringStreaming: checked,
          },
        } as any,
      });
      toast.success("Reasoning settings saved!");

      analytics.track("reasoning_display_changed", {
        setting: "show_during_streaming",
        value: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowDuringStreaming(!checked);
    }
  };

  const handleChatWidthChange = async (width: ChatWidth) => {
    const previousWidth = chatWidth;
    setChatWidth(width);
    try {
      await updatePreferences({
        preferences: { chatWidth: width },
      });
      toast.success("Chat width updated!");

      analytics.track("chat_width_changed", {
        newWidth: width,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setChatWidth(chatWidth); // Rollback
    }
  };

  const handleMessageStatsChange = async (checked: boolean) => {
    setShowMessageStats(checked);
    try {
      await updatePreferences({
        preferences: { showMessageStatistics: checked },
      });
      toast.success("Settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_message_statistics",
        value: checked,
        source: "settings_page",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowMessageStats(!checked);
    }
  };

  const handleComparisonStatsChange = async (checked: boolean) => {
    setShowComparisonStats(checked);
    try {
      await updatePreferences({
        preferences: { showComparisonStatistics: checked },
      });
      toast.success("Settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_comparison_statistics",
        value: checked,
        source: "settings_page",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowComparisonStats(!checked);
    }
  };

  const handleShowNotesChange = async (checked: boolean) => {
    setShowNotes(checked);
    try {
      await updatePreferences({
        preferences: { showNotes: checked },
      });
      toast.success("Settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_notes",
        value: checked,
        source: "settings_page",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowNotes(!checked);
    }
  };

  const handleShowTemplatesChange = async (checked: boolean) => {
    setShowTemplates(checked);
    try {
      await updatePreferences({
        preferences: { showTemplates: checked },
      });
      toast.success("Settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_templates",
        value: checked,
        source: "settings_page",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowTemplates(!checked);
    }
  };

  const handleShowProjectsChange = async (checked: boolean) => {
    setShowProjects(checked);
    try {
      await updatePreferences({
        preferences: { showProjects: checked },
      });
      toast.success("Settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_projects",
        value: checked,
        source: "settings_page",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowProjects(!checked);
    }
  };

  const handleShowBookmarksChange = async (checked: boolean) => {
    setShowBookmarks(checked);
    try {
      await updatePreferences({
        preferences: { showBookmarks: checked },
      });
      toast.success("Settings saved!");

      analytics.track("ui_preference_changed", {
        setting: "show_bookmarks",
        value: checked,
        source: "settings_page",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setShowBookmarks(!checked);
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
          {/* Display & Layout */}
          <AccordionItem value="display">
            <AccordionTrigger>Display & Layout</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label>Chat Width</Label>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred chat message width
                </p>
              </div>

              <div className="space-y-2">
                {(["narrow", "standard", "wide", "full"] as const).map(
                  (width) => (
                    <label
                      key={width}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                        chatWidth === width
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="chatWidth"
                        value={width}
                        checked={chatWidth === width}
                        onChange={() => handleChatWidthChange(width)}
                        className="sr-only"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium capitalize">{width}</div>
                        <div className="text-xs text-muted-foreground">
                          {width === "narrow" && "~672px - Focused reading"}
                          {width === "standard" &&
                            "~896px - Balanced (default)"}
                          {width === "wide" && "~1152px - Spacious"}
                          {width === "full" && "~95% width - Maximum space"}
                        </div>
                      </div>
                      {/* Visual indicator */}
                      <div
                        className="h-8 rounded border border-border/50 bg-muted/30"
                        style={{
                          width:
                            width === "narrow"
                              ? "40px"
                              : width === "standard"
                                ? "60px"
                                : width === "wide"
                                  ? "80px"
                                  : "100px",
                        }}
                      />
                    </label>
                  ),
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Statistics */}
          <AccordionItem value="stats">
            <AccordionTrigger>Statistics</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-message-stats">
                    Show message statistics
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display TTFT, TPS, and token counts below assistant messages
                  </p>
                </div>
                <Switch
                  id="show-message-stats"
                  checked={showMessageStats}
                  onCheckedChange={handleMessageStatsChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-comparison-stats">
                    Show comparison statistics
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display performance metrics in comparison mode (tokens,
                    cost, speed)
                  </p>
                </div>
                <Switch
                  id="show-comparison-stats"
                  checked={showComparisonStats}
                  onCheckedChange={handleComparisonStatsChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Message Behavior */}
          <AccordionItem value="messages">
            <AccordionTrigger>Message Behavior</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="always-show-actions">
                    Always show message actions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show copy, regenerate, branch, and delete buttons on all
                    messages instead of only on hover
                  </p>
                </div>
                <Switch
                  id="always-show-actions"
                  checked={alwaysShowMessageActions}
                  onCheckedChange={handleAlwaysShowActionsChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Reasoning Display */}
          <AccordionItem value="reasoning">
            <AccordionTrigger>Reasoning Display</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Control how AI thinking is displayed for reasoning models
                (o1/o3, DeepSeek R1)
              </p>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-reasoning">
                    Show reasoning sections
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display the thinking process when using reasoning models
                  </p>
                </div>
                <Switch
                  id="show-reasoning"
                  checked={showByDefault}
                  onCheckedChange={handleShowByDefaultChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-expand">Auto-expand reasoning</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically expand reasoning sections instead of keeping
                    them collapsed by default
                  </p>
                </div>
                <Switch
                  id="auto-expand"
                  checked={autoExpand}
                  onCheckedChange={handleAutoExpandChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-streaming">
                    Show reasoning while generating
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display reasoning as it streams in real-time during AI
                    response generation
                  </p>
                </div>
                <Switch
                  id="show-streaming"
                  checked={showDuringStreaming}
                  onCheckedChange={handleShowDuringStreamingChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Comparison Settings */}
          <AccordionItem value="comparison">
            <AccordionTrigger>Comparison Settings</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-model-names">
                    Show model names during comparison
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Display model identities immediately (enabled) or hide until
                    after voting (disabled) for unbiased comparison
                  </p>
                </div>
                <Switch
                  id="show-model-names"
                  checked={showModelNamesDuringComparison}
                  onCheckedChange={handleShowModelNamesChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sidebar Features */}
          <AccordionItem value="sidebar-features">
            <AccordionTrigger>Sidebar Features</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-notes">Show Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    Display notes feature in sidebar and message actions
                  </p>
                </div>
                <Switch
                  id="show-notes"
                  checked={showNotes}
                  onCheckedChange={handleShowNotesChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-templates">Show Templates</Label>
                  <p className="text-sm text-muted-foreground">
                    Display templates section in sidebar
                  </p>
                </div>
                <Switch
                  id="show-templates"
                  checked={showTemplates}
                  onCheckedChange={handleShowTemplatesChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-projects">Show Projects</Label>
                  <p className="text-sm text-muted-foreground">
                    Display projects feature across the app
                  </p>
                </div>
                <Switch
                  id="show-projects"
                  checked={showProjects}
                  onCheckedChange={handleShowProjectsChange}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-bookmarks">Show Bookmarks</Label>
                  <p className="text-sm text-muted-foreground">
                    Display bookmarks feature in sidebar and message actions
                  </p>
                </div>
                <Switch
                  id="show-bookmarks"
                  checked={showBookmarks}
                  onCheckedChange={handleShowBookmarksChange}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Onboarding Tour - Outside accordion */}
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
