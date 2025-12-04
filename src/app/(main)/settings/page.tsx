"use client";

import { BudgetSettings } from "@/components/settings/BudgetSettings";
import { CustomInstructionsForm } from "@/components/settings/CustomInstructionsForm";
import { MaintenanceSettings } from "@/components/settings/MaintenanceSettings";
import { MemorySettings } from "@/components/settings/MemorySettings";
import { MessageLimitSettings } from "@/components/settings/MessageLimitSettings";
import { SearchSettings } from "@/components/settings/SearchSettings";
import { STTSettings } from "@/components/settings/STTSettings";
import { UISettings } from "@/components/settings/UISettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";

const SETTINGS_SECTIONS = [
  {
    id: "personalization",
    label: "Personalization",
    component: CustomInstructionsForm,
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
    id: "search",
    label: "Search",
    component: SearchSettings,
  },
  {
    id: "budget",
    label: "Budget",
    component: BudgetSettings,
  },
  {
    id: "limits",
    label: "Limits",
    component: MessageLimitSettings,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    component: MaintenanceSettings,
  },
];

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-6 md:py-10 px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your preferences and configure the AI assistant.
        </p>
      </div>

      {/* Mobile View: Sectioned List */}
      <div className="block md:hidden space-y-10">
        {SETTINGS_SECTIONS.map((section) => (
          <section key={section.id} className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-foreground/90">
                {section.label}
              </h2>
              <Separator className="flex-1" />
            </div>
            <div className="px-1">
              <section.component />
            </div>
          </section>
        ))}
      </div>

      {/* Desktop View: Tabs */}
      <div className="hidden md:block">
        <Tabs
          defaultValue="personalization"
          className="w-full flex flex-col gap-6"
        >
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto flex-wrap gap-1">
            {SETTINGS_SECTIONS.map((section) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SETTINGS_SECTIONS.map((section) => (
            <TabsContent key={section.id} value={section.id} className="mt-0">
              <div className="bg-card border rounded-xl p-6 shadow-sm">
                <section.component />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
