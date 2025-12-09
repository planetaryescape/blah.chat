"use client";

import { FeaturesSettings } from "@/components/settings/admin/FeaturesSettings";
import { GeneralSettings } from "@/components/settings/admin/GeneralSettings";
import { AdminLimitsSettings } from "@/components/settings/admin/AdminLimitsSettings";
import { AdminMemorySettings } from "@/components/settings/admin/AdminMemorySettings";
import { AdminSearchSettings } from "@/components/settings/admin/AdminSearchSettings";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_SECTIONS = [
  {
    id: "general",
    label: "General",
    component: GeneralSettings,
  },
  {
    id: "memory",
    label: "Memory",
    component: AdminMemorySettings,
  },
  {
    id: "search",
    label: "Search",
    component: AdminSearchSettings,
  },
  {
    id: "limits",
    label: "Limits",
    component: AdminLimitsSettings,
  },
  {
    id: "features",
    label: "Features",
    component: FeaturesSettings,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-6 md:py-10 px-4 md:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage global platform settings and configurations.
        </p>
      </div>

      {/* Mobile View: Sectioned List */}
      <div className="block md:hidden space-y-10">
        {ADMIN_SECTIONS.map((section: any) => (
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

      {/* Desktop View: Vertical Tabs */}
      <div className="hidden md:block h-[calc(100vh-200px)]">
        <Tabs
          defaultValue="general"
          orientation="vertical"
          className="w-full h-full flex flex-row gap-6"
        >
          {/* Sidebar with vertical tabs - sticky so only content scrolls */}
          <TabsList className="sticky top-0 flex-shrink-0 w-48 h-fit flex-col items-stretch justify-start p-1.5 bg-muted/50 rounded-lg gap-1 self-start">
            {ADMIN_SECTIONS.map((section: any) => (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="justify-start px-4 py-2.5 rounded-md text-left data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Content area - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {ADMIN_SECTIONS.map((section: any) => (
              <TabsContent key={section.id} value={section.id} className="mt-0">
                <section.component />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
