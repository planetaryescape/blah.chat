"use client";

import { BarChart3, Loader2 } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useMemo } from "react";
import { BYODSettings } from "@/components/settings/BYODSettings";
import { CustomInstructionsForm } from "@/components/settings/CustomInstructionsForm";
import { DefaultModelSettings } from "@/components/settings/DefaultModelSettings";
import { MaintenanceSettings } from "@/components/settings/MaintenanceSettings";
import { MemorySettings } from "@/components/settings/MemorySettings";
import { ShortcutsSettings } from "@/components/settings/ShortcutsSettings";
import { STTSettings } from "@/components/settings/STTSettings";
import { UISettings } from "@/components/settings/UISettings";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFeatureFlag } from "@/hooks/usePostHogFeatureFlag";

const SETTINGS_SECTIONS = [
  {
    id: "personalization",
    label: "Personalization",
    component: CustomInstructionsForm,
  },
  {
    id: "models",
    label: "Models",
    component: DefaultModelSettings,
  },
  {
    id: "ui",
    label: "Interface",
    component: UISettings,
  },
  {
    id: "voice",
    label: "Voice",
    component: STTSettings,
  },
  {
    id: "memory",
    label: "Memory",
    component: MemorySettings,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    component: MaintenanceSettings,
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    component: ShortcutsSettings,
  },
  {
    id: "database",
    label: "Database",
    component: BYODSettings,
  },
];

function SettingsContent() {
  // Query state for deep linking
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsString.withDefault("personalization"),
  );
  const [focusSetting] = useQueryState("focus", parseAsString);
  const isBYODEnabled = useFeatureFlag("byod");

  // Filter sections based on feature flags
  const visibleSections = useMemo(() => {
    return SETTINGS_SECTIONS.filter((section) => {
      if (section.id === "database") {
        return isBYODEnabled === true;
      }
      return true;
    });
  }, [isBYODEnabled]);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col relative bg-background overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-none z-50 bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your preferences and configure the AI assistant
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/usage">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Usage
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Scrollable Content */}
      <ScrollArea className="flex-1 w-full min-h-0">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {/* Mobile View: Sectioned List */}
          <div className="block md:hidden space-y-10">
            {visibleSections.map((section: any) => (
              <section key={section.id} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </h2>
                  <Separator className="flex-1" />
                </div>
                <div className="px-1">
                  {section.id === "ui" ? (
                    <UISettings focusSettingKey={focusSetting} />
                  ) : (
                    <section.component />
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* Desktop View: Vertical Tabs */}
          <div className="hidden md:block">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              orientation="vertical"
              className="w-full flex flex-row gap-6"
            >
              {/* Sidebar with vertical tabs */}
              <TabsList className="flex-shrink-0 w-48 h-fit flex-col items-stretch justify-start p-1.5 bg-muted/50 rounded-lg gap-1">
                {visibleSections.map((section: any) => (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="justify-start px-4 py-2.5 rounded-md text-left data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                  >
                    {section.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Content area */}
              <div className="flex-1 min-h-0">
                {visibleSections.map((section: any) => (
                  <TabsContent
                    key={section.id}
                    value={section.id}
                    className="mt-0"
                  >
                    {section.id === "ui" ? (
                      <UISettings
                        focusSettingKey={
                          activeTab === "ui" ? focusSetting : undefined
                        }
                      />
                    ) : (
                      <section.component />
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
